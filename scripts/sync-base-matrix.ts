/**
 * Monthly: pull the latest passport-index-dataset tidy ISO3 CSV, compare it to
 * `base_matrix`, and if anything moved, write the updated dataset plus a
 * markdown summary for the pull request body.
 *
 * Exits 0 whether or not there are changes; the workflow reads
 * `changes=true|false` from $GITHUB_OUTPUT to decide whether to open a PR.
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatasetSchema, RawBaseValueSchema, type BaseMatrix } from "../src/lib/data/schema";
import { diffMatrix, hasChanges, parseTidyCsv, summariseDiff } from "../src/lib/base-matrix-diff";

const ROOT = path.resolve(import.meta.dirname, "..");
// Both overridable so the change path can be exercised on a copy.
const SOURCE = path.resolve(process.env["DATASET_PATH"] ?? path.join(ROOT, "data/visa-unlock-dataset.json"));
const SUMMARY = path.resolve(process.env["SUMMARY_PATH"] ?? path.join(ROOT, "base-matrix-summary.md"));
const CSV_URL =
  process.env["PASSPORT_INDEX_CSV_URL"] ??
  "https://raw.githubusercontent.com/ilyankou/passport-index-dataset/master/passport-index-tidy-iso3.csv";

function fail(message: string, detail?: string): never {
  console.error(`\n✖ sync-base-matrix: ${message}`);
  if (detail) console.error(`  ${detail}`);
  process.exit(1);
}

function output(key: string, value: string): void {
  const file = process.env["GITHUB_OUTPUT"];
  if (file) appendFileSync(file, `${key}=${value}\n`);
  console.log(`  ${key}=${value}`);
}

async function main(): Promise<void> {
  // Two views of the same file: `raw` is what gets written back, untouched
  // except for the fields this job owns; `dataset` is the validated view. Writing
  // the parsed object instead would stamp schema defaults (last_verified) into
  // every rule and bury the real changes in a 118-rule diff.
  const original = readFileSync(SOURCE, "utf8");
  const raw = JSON.parse(original) as {
    meta: { base_matrix_source: string } & Record<string, unknown>;
    base_matrix: BaseMatrix;
  } & Record<string, unknown>;
  const parsed = DatasetSchema.safeParse(raw);
  if (!parsed.success) fail("the current dataset does not validate; fix it before syncing.");
  const dataset = parsed.data;

  console.log(`Downloading ${CSV_URL}`);
  const response = await fetch(CSV_URL, { headers: { "User-Agent": "laissez-base-matrix-sync" } });
  if (!response.ok) fail(`download failed with HTTP ${response.status}`);
  const csv = await response.text();
  if (csv.length < 100_000) fail("the downloaded CSV looks truncated", `${csv.length} bytes`);

  let incoming: BaseMatrix;
  try {
    incoming = parseTidyCsv(csv);
  } catch (error) {
    fail("could not parse the CSV", error instanceof Error ? error.message : String(error));
  }

  // Every incoming value must be one the engine understands, or a later build
  // would fail on data this job had already committed.
  const unknown = new Map<string, string>();
  for (const [passport, row] of Object.entries(incoming)) {
    for (const [destination, value] of Object.entries(row)) {
      if (!RawBaseValueSchema.safeParse(value).success) {
        unknown.set(value, `${passport} -> ${destination}`);
      }
    }
  }
  if (unknown.size) {
    fail(
      `the CSV contains ${unknown.size} requirement value(s) the schema does not allow`,
      [...unknown].map(([v, where]) => `${JSON.stringify(v)} (first at ${where})`).join(", "),
    );
  }

  // Only compare countries we actually cover; upstream carries more.
  const covered = new Set(Object.keys(dataset.countries));
  const narrowed: BaseMatrix = {};
  for (const [passport, row] of Object.entries(incoming)) {
    if (!covered.has(passport)) continue;
    const kept: Record<string, (typeof row)[string]> = {};
    for (const [destination, value] of Object.entries(row)) {
      if (covered.has(destination)) kept[destination] = value;
    }
    narrowed[passport] = kept;
  }

  const diff = diffMatrix(dataset.base_matrix, narrowed);
  console.log(`\nCompared ${diff.compared.toLocaleString("en-GB")} pairs`);
  console.log(`  changed:  ${diff.changed.length}`);
  console.log(`  added:    ${diff.addedPairs.length} pairs, ${diff.addedPassports.length} passports`);
  console.log(`  removed:  ${diff.removedPairs.length} pairs, ${diff.removedPassports.length} passports`);

  if (!hasChanges(diff)) {
    console.log("\n✓ base matrix is already up to date; nothing to open.");
    output("changes", "false");
    return;
  }

  for (const c of diff.changed.slice(0, 20)) {
    console.log(`  ${c.passport} -> ${c.destination}: ${c.from} => ${c.to}`);
  }
  if (diff.changed.length > 20) console.log(`  …and ${diff.changed.length - 20} more`);

  // Merge: keep every pair we already had, applying upstream values, and add new
  // ones. Pairs upstream dropped are left alone rather than silently deleted.
  // Spreading the existing row first keeps every key in its original position,
  // so a changed cell is a one-line diff rather than a reordered row.
  const merged: BaseMatrix = structuredClone(raw.base_matrix);
  for (const [passport, row] of Object.entries(narrowed)) {
    merged[passport] = { ...(merged[passport] ?? {}), ...row };
  }

  const today = new Date().toISOString().slice(0, 10);
  const updated = {
    ...raw,
    meta: {
      ...raw.meta,
      base_matrix_source: raw.meta.base_matrix_source.replace(
        /downloaded \d{4}-\d{2}-\d{2}/,
        `downloaded ${today}`,
      ),
    },
    base_matrix: merged,
  };

  // Re-validate what we are about to commit.
  const check = DatasetSchema.safeParse(updated);
  if (!check.success) {
    fail(
      "the merged dataset does not validate; nothing was written",
      check.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  }

  // Match the source file's formatting exactly (one-space indent, and keep or
  // omit the trailing newline as the original did) so the diff is only data.
  const trailing = original.endsWith("\n") ? "\n" : "";
  writeFileSync(SOURCE, `${JSON.stringify(updated, null, 1)}${trailing}`);
  const nameOf = (iso3: string) => dataset.countries[iso3] ?? iso3;
  writeFileSync(SUMMARY, summariseDiff(diff, nameOf));

  console.log(`\n✓ wrote ${SOURCE} and ${SUMMARY}`);
  output("changes", "true");
  output("changed_pairs", String(diff.changed.length));
  output("branch", `data/base-matrix-${today}`);
  output("title", `Base matrix update: ${diff.changed.length} changed pairs (${today})`);
}

main().catch((error: unknown) => {
  fail("unexpected error", error instanceof Error ? (error.stack ?? error.message) : String(error));
});
