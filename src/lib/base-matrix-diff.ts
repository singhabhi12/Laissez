import type { BaseMatrix, RawBaseValue } from "./data/schema";

export interface MatrixChange {
  passport: string;
  destination: string;
  from: RawBaseValue;
  to: RawBaseValue;
}

export interface MatrixDiff {
  changed: MatrixChange[];
  addedPassports: string[];
  removedPassports: string[];
  addedPairs: { passport: string; destination: string; to: RawBaseValue }[];
  removedPairs: { passport: string; destination: string; from: RawBaseValue }[];
  /** Pairs compared on both sides. */
  compared: number;
}

/** Parses the upstream tidy CSV: Passport,Destination,Requirement. */
export function parseTidyCsv(csv: string): BaseMatrix {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = lines.shift();
  if (!header || !/^passport,destination,requirement$/i.test(header.trim())) {
    throw new Error(`Unexpected CSV header: ${JSON.stringify(header ?? "")}`);
  }

  const matrix: BaseMatrix = {};
  for (const [i, line] of lines.entries()) {
    const cells = line.split(",");
    if (cells.length !== 3) throw new Error(`Row ${i + 2} has ${cells.length} columns: ${line}`);
    const [passport, destination, requirement] = cells.map((c) => c.trim()) as [string, string, string];
    if (!/^[A-Z]{3}$/.test(passport) || !/^[A-Z]{3}$/.test(destination)) {
      throw new Error(`Row ${i + 2} has a non-ISO3 code: ${line}`);
    }
    (matrix[passport] ??= {})[destination] = requirement as RawBaseValue;
  }
  return matrix;
}

export function diffMatrix(current: BaseMatrix, incoming: BaseMatrix): MatrixDiff {
  const diff: MatrixDiff = {
    changed: [],
    addedPassports: [],
    removedPassports: [],
    addedPairs: [],
    removedPairs: [],
    compared: 0,
  };

  const currentPassports = new Set(Object.keys(current));
  const incomingPassports = new Set(Object.keys(incoming));

  diff.addedPassports = [...incomingPassports].filter((p) => !currentPassports.has(p)).sort();
  diff.removedPassports = [...currentPassports].filter((p) => !incomingPassports.has(p)).sort();

  for (const passport of [...currentPassports].sort()) {
    const before = current[passport]!;
    const after = incoming[passport];
    if (!after) continue; // whole passport removed, reported above

    for (const [destination, from] of Object.entries(before)) {
      const to = after[destination];
      if (to === undefined) {
        diff.removedPairs.push({ passport, destination, from });
        continue;
      }
      diff.compared++;
      if (to !== from) diff.changed.push({ passport, destination, from, to });
    }
    for (const [destination, to] of Object.entries(after)) {
      if (before[destination] === undefined) diff.addedPairs.push({ passport, destination, to });
    }
  }

  diff.changed.sort(
    (a, b) => a.passport.localeCompare(b.passport) || a.destination.localeCompare(b.destination),
  );
  return diff;
}

export const hasChanges = (d: MatrixDiff): boolean =>
  d.changed.length > 0 ||
  d.addedPassports.length > 0 ||
  d.removedPassports.length > 0 ||
  d.addedPairs.length > 0 ||
  d.removedPairs.length > 0;

/** Markdown for the pull request body. Long lists are capped so the PR stays readable. */
export function summariseDiff(diff: MatrixDiff, nameOf: (iso3: string) => string, cap = 100): string {
  const lines: string[] = [];
  lines.push("## Base matrix update", "");
  lines.push(
    `Compared **${diff.compared.toLocaleString("en-GB")}** passport and destination pairs against ` +
      "[passport-index-dataset](https://github.com/ilyankou/passport-index-dataset) (tidy ISO3 CSV).",
    "",
  );
  lines.push("| | |", "| --- | --- |");
  lines.push(`| Changed pairs | ${diff.changed.length} |`);
  if (diff.addedPairs.length) lines.push(`| New pairs | ${diff.addedPairs.length} |`);
  if (diff.removedPairs.length) lines.push(`| Removed pairs | ${diff.removedPairs.length} |`);
  if (diff.addedPassports.length) lines.push(`| New passports | ${diff.addedPassports.join(", ")} |`);
  if (diff.removedPassports.length) lines.push(`| Removed passports | ${diff.removedPassports.join(", ")} |`);
  lines.push("");

  if (diff.changed.length) {
    const byPassport = new Map<string, number>();
    for (const c of diff.changed) byPassport.set(c.passport, (byPassport.get(c.passport) ?? 0) + 1);
    const top = [...byPassport.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    lines.push("### Most affected passports", "");
    for (const [p, n] of top) lines.push(`- **${nameOf(p)}** (\`${p}\`): ${n} change${n === 1 ? "" : "s"}`);
    lines.push("");

    lines.push("### Changed pairs", "");
    lines.push("| Passport | Destination | Was | Now |", "| --- | --- | --- | --- |");
    for (const c of diff.changed.slice(0, cap)) {
      lines.push(
        `| ${nameOf(c.passport)} (\`${c.passport}\`) | ${nameOf(c.destination)} (\`${c.destination}\`) | \`${c.from}\` | \`${c.to}\` |`,
      );
    }
    if (diff.changed.length > cap) {
      lines.push("", `_…and ${diff.changed.length - cap} more. See the diff on the data file._`);
    }
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "Opened automatically by the monthly `sync-base-matrix` workflow.",
    "**Review before merging:** upstream changes are not individually verified, and the rules in",
    "`rules` are untouched — a base change can make an existing rule redundant or newly relevant.",
  );
  return lines.join("\n");
}
