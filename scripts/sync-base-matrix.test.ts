import { describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "data/visa-unlock-dataset.json");

/** Rebuilds the upstream CSV from our own base_matrix, applying `edits`. */
function csvFrom(matrix: Record<string, Record<string, string>>, edits: Record<string, string> = {}) {
  const rows = ["Passport,Destination,Requirement"];
  for (const [p, row] of Object.entries(matrix)) {
    for (const [d, v] of Object.entries(row)) rows.push(`${p},${d},${edits[`${p}-${d}`] ?? v}`);
  }
  return rows.join("\n") + "\n";
}

async function sync(csv: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "sync-"));
  const dataset = path.join(dir, "dataset.json");
  const summary = path.join(dir, "summary.md");
  const output = path.join(dir, "out");
  writeFileSync(dataset, readFileSync(SOURCE));

  const server = createServer((_, res) => res.end(csv));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  try {
    await run("npx", ["tsx", path.join(ROOT, "scripts/sync-base-matrix.ts")], {
      cwd: ROOT,
      env: {
        ...process.env,
        DATASET_PATH: dataset,
        SUMMARY_PATH: summary,
        GITHUB_OUTPUT: output,
        PASSPORT_INDEX_CSV_URL: `http://127.0.0.1:${port}/x.csv`,
      },
    });
  } finally {
    server.close();
  }
  return {
    before: readFileSync(SOURCE, "utf8"),
    after: readFileSync(dataset, "utf8"),
    outputs: readFileSync(output, "utf8"),
    summary: existsSync(summary) ? readFileSync(summary, "utf8") : undefined,
  };
}

const matrix = JSON.parse(readFileSync(SOURCE, "utf8")).base_matrix as Record<string, Record<string, string>>;

describe("sync-base-matrix script", () => {
  it("leaves the file byte-identical and opens nothing when upstream matches", async () => {
    const r = await sync(csvFrom(matrix));
    expect(r.outputs).toContain("changes=false");
    expect(r.after).toBe(r.before);
    expect(r.summary).toBeUndefined();
  }, 60_000);

  // Regression: writing the Zod-parsed object stamped `last_verified` into all
  // 118 rules and buried real changes in a whole-file diff.
  it("changes only the edited cells and the download date", async () => {
    const r = await sync(csvFrom(matrix, { "IND-THA": "visa required", "NGA-GBR": "e-visa" }));
    expect(r.outputs).toContain("changes=true");
    expect(r.outputs).toContain("changed_pairs=2");

    const before = r.before.split("\n");
    const after = r.after.split("\n");
    expect(after).toHaveLength(before.length);
    const changed = before.flatMap((line, i) => (line === after[i] ? [] : [after[i]!.trim()]));
    expect(changed).toHaveLength(3);
    expect(changed.some((l) => /downloaded \d{4}-\d{2}-\d{2}/.test(l))).toBe(true);
    expect(changed).toContain('"THA": "visa required",');
    expect(changed).toContain('"GBR": "e-visa",');

    expect(r.after).not.toContain('"last_verified"');
    expect(r.after.endsWith("\n")).toBe(r.before.endsWith("\n"));
    expect(r.summary).toContain("| Changed pairs | 2 |");
  }, 60_000);

  it("refuses requirement values the schema does not allow", async () => {
    await expect(sync(csvFrom(matrix, { "IND-THA": "maybe later" }))).rejects.toThrow();
  }, 60_000);
});
