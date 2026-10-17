import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { analyseFreshness, formatTable } from "./freshness";
import { diffMatrix, hasChanges, parseTidyCsv, summariseDiff } from "./base-matrix-diff";
import { DatasetSchema, type Rule } from "./data/schema";

const rule = (over: Partial<Rule>): Rule =>
  ({
    id: "X-1",
    dest: "ALB",
    nat: { all: true, except: [] },
    docs: [{ issuers: ["USA"], types: ["visa"] }],
    doc_conditions: "Valid visa.",
    grant: "visa_free",
    max_stay_days: 90,
    confidence: "high",
    sources: ["https://example.gov"],
    notes: "",
    last_verified: "2026-10-16",
    ...over,
  }) as Rule;

const on = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("freshness", () => {
  it("fails a rule whose valid_until has passed", () => {
    const r = analyseFreshness([rule({ id: "OLD-1", valid_until: "2026-10-01" })], on("2026-10-17"));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ ruleId: "OLD-1", issue: "expired" });
  });

  it("does not fail on the last valid day itself", () => {
    const r = analyseFreshness([rule({ valid_until: "2026-10-17" })], on("2026-10-17"));
    expect(r.errors).toHaveLength(0);
  });

  it("warns, without failing, when a rule expires within 30 days", () => {
    const r = analyseFreshness([rule({ valid_until: "2026-10-31" })], on("2026-10-17"));
    expect(r.errors).toHaveLength(0);
    expect(r.warnings[0]?.issue).toBe("expiring soon");
  });

  it("warns when last_verified is older than 90 days", () => {
    const r = analyseFreshness([rule({ last_verified: "2026-01-01" })], on("2026-10-17"));
    expect(r.warnings.map((w) => w.issue)).toContain("stale");
    expect(analyseFreshness([rule({ last_verified: "2026-08-01" })], on("2026-10-17")).warnings).toHaveLength(0);
  });

  it("warns on low confidence", () => {
    const r = analyseFreshness([rule({ confidence: "low" })], on("2026-10-17"));
    expect(r.warnings[0]?.issue).toBe("low confidence");
  });

  it("lists errors before warnings in the table", () => {
    const r = analyseFreshness(
      [rule({ id: "A-1", confidence: "low" }), rule({ id: "Z-9", valid_until: "2026-01-01" })],
      on("2026-10-17"),
    );
    const table = formatTable(r.findings).split("\n");
    expect(table[2]).toContain("Z-9");
    expect(table[3]).toContain("A-1");
  });

  it("finds nothing expired in the real dataset today", () => {
    const data = DatasetSchema.parse(
      JSON.parse(readFileSync(path.join(import.meta.dirname, "../../data/visa-unlock-dataset.json"), "utf8")),
    );
    const r = analyseFreshness([...data.rules, ...data.territory_rules], on("2026-10-17"));
    expect(r.errors).toHaveLength(0);
  });
});

describe("base matrix sync", () => {
  const csv = "Passport,Destination,Requirement\nIND,THA,60\nIND,USA,visa required\nNGA,GBR,visa required\n";

  it("parses the tidy CSV", () => {
    expect(parseTidyCsv(csv)).toEqual({
      IND: { THA: "60", USA: "visa required" },
      NGA: { GBR: "visa required" },
    });
  });

  it("rejects an unexpected header and malformed rows", () => {
    expect(() => parseTidyCsv("a,b,c\nIND,THA,60")).toThrow(/header/);
    expect(() => parseTidyCsv("Passport,Destination,Requirement\nIND,THA")).toThrow(/columns/);
    expect(() => parseTidyCsv("Passport,Destination,Requirement\nINDIA,THA,60")).toThrow(/ISO3/);
  });

  it("reports nothing when the matrices match", () => {
    const m = parseTidyCsv(csv);
    expect(hasChanges(diffMatrix(m, structuredClone(m)))).toBe(false);
  });

  it("reports changed, added and removed pairs", () => {
    const before = parseTidyCsv(csv);
    const after = parseTidyCsv(
      "Passport,Destination,Requirement\nIND,THA,visa required\nIND,JPN,eta\nNGA,GBR,visa required\n",
    );
    const d = diffMatrix(before, after);
    expect(d.changed).toEqual([{ passport: "IND", destination: "THA", from: "60", to: "visa required" }]);
    expect(d.addedPairs).toEqual([{ passport: "IND", destination: "JPN", to: "eta" }]);
    expect(d.removedPairs).toEqual([{ passport: "IND", destination: "USA", from: "visa required" }]);
  });

  it("summarises changes with names for the pull request", () => {
    const before = parseTidyCsv(csv);
    const after = parseTidyCsv("Passport,Destination,Requirement\nIND,THA,visa required\nIND,USA,visa required\nNGA,GBR,visa required\n");
    const md = summariseDiff(diffMatrix(before, after), (c) => ({ IND: "India", THA: "Thailand" })[c] ?? c);
    expect(md).toContain("| Changed pairs | 1 |");
    expect(md).toContain("| India (`IND`) | Thailand (`THA`) | `60` | `visa required` |");
    expect(md).toContain("Review before merging");
  });

  it("caps the changed-pairs table", () => {
    const before: Record<string, Record<string, "60">> = { IND: {} };
    const after: Record<string, Record<string, "eta">> = { IND: {} };
    for (let i = 0; i < 150; i++) {
      const dest = `D${String(i).padStart(2, "0")}`.slice(0, 3).padEnd(3, "X");
      before["IND"]![`${dest}${i}`] = "60";
      after["IND"]![`${dest}${i}`] = "eta";
    }
    const md = summariseDiff(diffMatrix(before, after), (c) => c, 100);
    expect(md).toContain("…and 50 more");
  });
});
