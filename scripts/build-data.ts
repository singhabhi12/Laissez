/**
 * Validates data/visa-unlock-dataset.json and writes the per-passport shards the
 * browser actually loads. Runs before `next build` (see package.json).
 *
 * Any schema problem, unknown country code or unresolvable group fails loudly
 * with a non-zero exit code so a broken dataset can never reach a build.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import isoCountries from "i18n-iso-countries";
import worldCountries from "world-countries";

import { DatasetSchema, type BaseRequirement, type Dataset } from "../src/lib/data/schema";
import { ISO, flagEmoji } from "../src/lib/data/iso";
import { normaliseBase, type EnrichedCountry, type Region } from "../src/lib/data/enrich";
import { rankPresets } from "../src/lib/next-visa";
import { presetDocuments } from "../src/lib/documents";
import type { UnlockData } from "../src/lib/unlock";
import { slugify, demonymPlural } from "../src/lib/slugs";

const ROOT = path.resolve(import.meta.dirname, "..");
// DATASET_PATH exists so the failure paths can be exercised against a fixture.
const SOURCE = process.env["DATASET_PATH"]
  ? path.resolve(process.env["DATASET_PATH"])
  : path.join(ROOT, "data/visa-unlock-dataset.json");
const OUT = process.env["DATA_OUT_DIR"]
  ? path.resolve(process.env["DATA_OUT_DIR"])
  : path.join(ROOT, "public/data");

const show = (p: string) => {
  const rel = path.relative(ROOT, p);
  return rel.startsWith("..") ? p : rel;
};

function fail(heading: string, details: string[]): never {
  console.error(`\n✖ build-data: ${heading}\n`);
  for (const line of details) console.error(`  ${line}`);
  console.error("");
  process.exit(1);
}

function parseDataset(): Dataset {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(SOURCE, "utf8"));
  } catch (error) {
    fail(`could not read ${show(SOURCE)}`, [String(error)]);
  }

  const result = DatasetSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.slice(0, 40).map((issue) => {
      const where = issue.path.length ? issue.path.join(".") : "(root)";
      return `${where}: ${issue.message}`;
    });
    const extra = result.error.issues.length - issues.length;
    fail(
      `${result.error.issues.length} schema error(s) in ${show(SOURCE)}`,
      extra > 0 ? [...issues, `… and ${extra} more`] : issues,
    );
  }
  return result.data;
}

/** Every country needs an iso2 + region, and every referenced code must resolve. */
function checkReferences(data: Dataset): void {
  const problems: string[] = [];
  const codes = new Set(Object.keys(data.countries));
  const groups = new Set(Object.keys(data.groups));
  // Pseudo-issuers the dataset uses in place of a country or group.
  const PSEUDO = new Set(["ANY", "VOA_ELIGIBLE"]);

  for (const iso3 of codes) {
    if (!ISO[iso3]) problems.push(`countries.${iso3}: missing from the iso3 -> iso2/region map in src/lib/data/iso.ts`);
  }
  for (const iso3 of Object.keys(ISO)) {
    if (!codes.has(iso3)) problems.push(`iso.ts has ${iso3}, which the dataset does not list`);
  }
  for (const [group, members] of Object.entries(data.groups)) {
    for (const m of members) {
      if (!codes.has(m)) problems.push(`groups.${group}: unknown member ${m}`);
    }
  }
  for (const passport of Object.keys(data.base_matrix)) {
    if (!codes.has(passport)) problems.push(`base_matrix.${passport}: unknown passport`);
    for (const dest of Object.keys(data.base_matrix[passport]!)) {
      if (!codes.has(dest)) problems.push(`base_matrix.${passport}.${dest}: unknown destination`);
    }
  }
  const allRules = [...data.rules, ...data.territory_rules];
  for (const rule of allRules) {
    if ("dest" in rule && !codes.has(rule.dest) && !groups.has(rule.dest)) {
      problems.push(`${rule.id}: dest ${rule.dest} is neither a country nor a group`);
    }
    const nat = rule.nat;
    const listed = "list" in nat ? nat.list : nat.except;
    for (const p of listed) {
      if (!codes.has(p)) problems.push(`${rule.id}: nat references unknown passport ${p}`);
    }
    for (const spec of rule.docs) {
      for (const issuer of spec.issuers) {
        if (!codes.has(issuer) && !groups.has(issuer) && !PSEUDO.has(issuer)) {
          problems.push(`${rule.id}: issuer ${issuer} is neither a country, a group nor a known pseudo-code`);
        }
      }
    }
  }
  for (const w of data.warnings) {
    if (!codes.has(w.dest)) problems.push(`warnings: unknown dest ${w.dest}`);
  }

  if (problems.length) {
    fail(`${problems.length} reference error(s)`, problems.slice(0, 40));
  }
}

/** world-countries has no entry for Kosovo, so its demonym is supplied here. */
const DEMONYM_OVERRIDES: Record<string, string> = { XKX: "Kosovan" };

const demonymByIso3 = new Map(
  worldCountries.map((c) => [c.cca3, c.demonyms?.eng?.m ?? ""] as const),
);

function enrichCountries(data: Dataset): Record<string, EnrichedCountry> {
  const out: Record<string, EnrichedCountry> = {};
  const missingNumeric: string[] = [];
  const missingDemonym: string[] = [];
  const slugs = new Map<string, string>();

  for (const [iso3, name] of Object.entries(data.countries)) {
    const entry = ISO[iso3]!;
    const [iso2, region] = entry as readonly [string, Region];

    const numeric = isoCountries.alpha2ToNumeric(iso2);
    if (!numeric) missingNumeric.push(`${iso3}/${iso2}`);

    const demonym = DEMONYM_OVERRIDES[iso3] ?? demonymByIso3.get(iso3) ?? "";
    if (!demonym) missingDemonym.push(`${iso3} (${name})`);

    const slug = slugify(name);
    const clash = slugs.get(slug);
    if (clash) fail("two countries produce the same slug", [`${slug}: ${clash} and ${iso3}`]);
    slugs.set(slug, iso3);

    out[iso3] = {
      iso3,
      iso2,
      name,
      region,
      flagEmoji: flagEmoji(iso2),
      numeric: String(Number(numeric)),
      slug,
      demonym,
      demonymPlural: demonymPlural(demonym),
    };
  }

  if (missingNumeric.length) fail("countries without an ISO numeric code", missingNumeric);
  if (missingDemonym.length) fail("countries without an English demonym", missingDemonym);
  return out;
}

/**
 * ISO numeric -> ISO3, for matching world-110m TopoJSON features (whose `id` is
 * the numeric code). A few features in that file carry no id at all, so they are
 * matched by name instead.
 */
function isoNumericIndex(countries: Record<string, EnrichedCountry>) {
  const byNumeric: Record<string, string> = {};
  for (const c of Object.values(countries)) byNumeric[c.numeric] = c.iso3;
  return {
    byNumeric,
    byName: { Kosovo: "XKX" },
  };
}

function write(file: string, value: unknown): number {
  const target = path.join(OUT, file);
  mkdirSync(path.dirname(target), { recursive: true });
  const body = JSON.stringify(value);
  writeFileSync(target, body);
  return Buffer.byteLength(body);
}

function main(): void {
  const data = parseDataset();
  checkReferences(data);
  const countries = enrichCountries(data);

  rmSync(OUT, { recursive: true, force: true });

  // Shared country directory: names, regions and flags, referenced by iso3.
  // Kept in one file rather than repeated inside all 199 passport shards.
  const countriesBytes = write("countries.json", {
    generated_from: data.meta.researched_on,
    countries,
  });

  const isoBytes = write("iso-numeric.json", isoNumericIndex(countries));
  const slugBytes = write(
    "slugs.json",
    Object.fromEntries(Object.values(countries).map((c) => [c.slug, c.iso3])),
  );

  // Normalise every row up front: the shards need them, and so does the engine
  // when it precomputes the next-visa ranking below.
  const passports = Object.keys(data.base_matrix).sort();
  const baseRows = new Map<string, Record<string, BaseRequirement>>();
  const daysRows = new Map<string, Record<string, number>>();
  for (const passport of passports) {
    const base: Record<string, BaseRequirement> = {};
    const visaFreeDays: Record<string, number> = {};
    for (const [dest, raw] of Object.entries(data.base_matrix[passport]!)) {
      const { requirement, visaFreeDays: days } = normaliseBase(raw);
      base[dest] = requirement;
      if (days !== undefined) visaFreeDays[dest] = days;
    }
    baseRows.set(passport, base);
    daysRows.set(passport, visaFreeDays);
  }

  const unlockData: UnlockData = {
    baseFor: (p) => baseRows.get(p),
    visaFreeDaysFor: (p) => daysRows.get(p),
    groups: data.groups,
    rules: data.rules,
    territoryRules: data.territory_rules,
  };

  // Deterministic date so repeated builds produce identical output. The browser
  // recomputes whenever the traveller holds documents or passes ?date=.
  const asOf = new Date(`${data.meta.researched_on}T00:00:00.000Z`);
  const nameOf = (iso3: string) => countries[iso3]?.name ?? iso3;

  let passportBytes = 0;
  let biggest = 0;
  const rankStart = Date.now();
  for (const passport of passports) {
    const nextVisa = rankPresets(passport, [], asOf, unlockData, presetDocuments, nameOf);
    const bytes = write(`passports/${passport}.json`, {
      passport,
      generated_from: data.meta.researched_on,
      base: baseRows.get(passport)!,
      visa_free_days: daysRows.get(passport)!,
      next_visa_as_of: data.meta.researched_on,
      next_visa: nextVisa,
    });
    passportBytes += bytes;
    biggest = Math.max(biggest, bytes);
  }
  const rankMs = Date.now() - rankStart;

  // Rules side, shared by every passport. last_verified is filled in by the
  // schema default, so every rule carries one.
  const rulesBytes = write("rules.json", {
    generated_from: data.meta.researched_on,
    status_rank: data.meta.status_rank,
    document_types: data.meta.document_types,
    groups: data.groups,
    rules: data.rules,
    territory_rules: data.territory_rules,
    warnings: data.warnings,
    coverage: data.coverage,
  });

  const sourceBytes = Buffer.byteLength(readFileSync(SOURCE));
  const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`;
  console.log("✓ build-data");
  console.log(`  source              ${kb(sourceBytes)} (never shipped to the browser)`);
  console.log(`  countries.json      ${kb(countriesBytes)}`);
  console.log(`  iso-numeric.json    ${kb(isoBytes)}`);
  console.log(`  slugs.json          ${kb(slugBytes)}`);
  console.log(`  rules.json          ${kb(rulesBytes)}`);
  console.log(`  passports/*.json    ${passports.length} files, ${kb(passportBytes)} total, largest ${kb(biggest)}`);
  console.log(`  per-passport load   ${kb(biggest + rulesBytes + countriesBytes)} worst case`);
  console.log(`  next-visa ranking   ${passports.length} passports x ${presetDocuments.length} presets in ${rankMs} ms`);
  console.log(`  rules              ${data.rules.length} + ${data.territory_rules.length} territory, all stamped last_verified`);
}

try {
  main();
} catch (error) {
  if (error instanceof z.ZodError) {
    fail("unexpected validation error", error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  }
  fail("unexpected error", [error instanceof Error ? (error.stack ?? error.message) : String(error)]);
}
