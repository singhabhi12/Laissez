import type { Rule, TerritoryRule } from "./data/schema";

export type FreshnessLevel = "error" | "warning";

export interface FreshnessFinding {
  level: FreshnessLevel;
  ruleId: string;
  dest: string;
  issue: string;
  detail: string;
}

export interface FreshnessReport {
  findings: FreshnessFinding[];
  errors: FreshnessFinding[];
  warnings: FreshnessFinding[];
  checked: number;
}

/** Rules unverified for longer than this are called out. */
export const STALE_AFTER_DAYS = 90;
/** A rule expiring within this window is flagged before it breaks the build. */
export const EXPIRING_SOON_DAYS = 30;

const day = (iso: string) => Date.parse(`${iso}T00:00:00.000Z`);
const daysBetween = (a: number, b: number) => Math.floor((a - b) / 86_400_000);

const destOf = (rule: Rule | TerritoryRule) => ("dest" in rule ? rule.dest : rule.dest_name);

/**
 * Pure freshness analysis so CI and the unit tests agree.
 *
 * Errors fail the build: a rule whose `valid_until` has passed is actively
 * wrong, because the engine will still apply it until someone removes it.
 * Warnings are advisory: long-unverified rules and low-confidence ones.
 */
export function analyseFreshness(
  rules: readonly (Rule | TerritoryRule)[],
  today: Date,
): FreshnessReport {
  const now = day(today.toISOString().slice(0, 10));
  const findings: FreshnessFinding[] = [];

  for (const rule of rules) {
    const dest = destOf(rule);

    if (rule.valid_until) {
      const until = day(rule.valid_until);
      const age = daysBetween(now, until);
      if (age > 0) {
        findings.push({
          level: "error",
          ruleId: rule.id,
          dest,
          issue: "expired",
          detail: `valid_until ${rule.valid_until} passed ${age} day${age === 1 ? "" : "s"} ago`,
        });
      } else if (-age <= EXPIRING_SOON_DAYS) {
        findings.push({
          level: "warning",
          ruleId: rule.id,
          dest,
          issue: "expiring soon",
          detail: `valid_until ${rule.valid_until} is in ${-age} day${-age === 1 ? "" : "s"}`,
        });
      }
    }

    const age = daysBetween(now, day(rule.last_verified));
    if (age > STALE_AFTER_DAYS) {
      findings.push({
        level: "warning",
        ruleId: rule.id,
        dest,
        issue: "stale",
        detail: `last verified ${rule.last_verified}, ${age} days ago`,
      });
    }

    if (rule.confidence === "low") {
      findings.push({
        level: "warning",
        ruleId: rule.id,
        dest,
        issue: "low confidence",
        detail: rule.sources[0] ?? "no source",
      });
    }
  }

  // Errors first, then by rule id, so the table reads predictably.
  findings.sort(
    (a, b) =>
      Number(b.level === "error") - Number(a.level === "error") || a.ruleId.localeCompare(b.ruleId),
  );

  return {
    findings,
    errors: findings.filter((f) => f.level === "error"),
    warnings: findings.filter((f) => f.level === "warning"),
    checked: rules.length,
  };
}

/** Fixed-width table for CI logs. */
export function formatTable(findings: readonly FreshnessFinding[]): string {
  if (!findings.length) return "";
  const head = ["", "RULE", "DESTINATION", "ISSUE", "DETAIL"];
  const rows = findings.map((f) => [
    f.level === "error" ? "✖" : "!",
    f.ruleId,
    f.dest,
    f.issue,
    f.detail,
  ]);
  const widths = head.map((_, i) =>
    Math.max(head[i]!.length, ...rows.map((r) => r[i]!.length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd();
  return [line(head), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}
