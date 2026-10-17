/**
 * Fails CI when a rule has outlived its `valid_until`, and warns about rules
 * that have not been verified for a while or rest on weak sources.
 *
 * Run by the CI workflow on every push and pull request.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatasetSchema } from "../src/lib/data/schema";
import { analyseFreshness, formatTable, EXPIRING_SOON_DAYS, STALE_AFTER_DAYS } from "../src/lib/freshness";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "data/visa-unlock-dataset.json");

// Overridable so the behaviour can be exercised without waiting for a date.
const today = process.env["FRESHNESS_TODAY"]
  ? new Date(`${process.env["FRESHNESS_TODAY"]}T00:00:00.000Z`)
  : new Date();

const parsed = DatasetSchema.safeParse(JSON.parse(readFileSync(SOURCE, "utf8")));
if (!parsed.success) {
  console.error("✖ check-freshness: the dataset does not validate; run `npm run data:build` for detail.");
  process.exit(1);
}

const rules = [...parsed.data.rules, ...parsed.data.territory_rules];
const report = analyseFreshness(rules, today);

console.log(`check-freshness — ${report.checked} rules as of ${today.toISOString().slice(0, 10)}`);
console.log(`  expired (fails):      ${report.errors.length}`);
console.log(`  warnings:             ${report.warnings.length}`);
console.log(
  `  thresholds: stale after ${STALE_AFTER_DAYS} days, expiring-soon within ${EXPIRING_SOON_DAYS} days\n`,
);

if (report.findings.length) {
  console.log(formatTable(report.findings));
  console.log("");
}

if (report.errors.length) {
  console.error(
    `✖ ${report.errors.length} rule${report.errors.length === 1 ? " has" : "s have"} expired. ` +
      `Update or remove them in data/visa-unlock-dataset.json.`,
  );
  process.exit(1);
}

console.log(
  report.warnings.length
    ? `✓ no expired rules. ${report.warnings.length} warning${report.warnings.length === 1 ? "" : "s"} above need attention.`
    : "✓ no expired rules and nothing needs attention.",
);
