import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatasetSchema, type BaseRequirement } from "./data/schema";
import { normaliseBase } from "./data/enrich";
import { rankPresets, presetKey } from "./next-visa";
import { presetDocuments } from "./documents";
import type { PassportFile } from "./data/types";
import type { UnlockData } from "./unlock";
import { resultsHref } from "./routes";
import { parseDocs } from "./query-state";

const root = path.join(import.meta.dirname, "../..");
const dataset = DatasetSchema.parse(
  JSON.parse(readFileSync(path.join(root, "data/visa-unlock-dataset.json"), "utf8")),
);

const shard = (iso3: string) =>
  JSON.parse(readFileSync(path.join(root, `public/data/passports/${iso3}.json`), "utf8")) as PassportFile;

const baseRows = new Map<string, Record<string, BaseRequirement>>();
const daysRows = new Map<string, Record<string, number>>();
for (const [passport, row] of Object.entries(dataset.base_matrix)) {
  const base: Record<string, BaseRequirement> = {};
  const days: Record<string, number> = {};
  for (const [dest, raw] of Object.entries(row)) {
    const n = normaliseBase(raw);
    base[dest] = n.requirement;
    if (n.visaFreeDays !== undefined) days[dest] = n.visaFreeDays;
  }
  baseRows.set(passport, base);
  daysRows.set(passport, days);
}

const data: UnlockData = {
  baseFor: (p) => baseRows.get(p),
  visaFreeDaysFor: (p) => daysRows.get(p),
  groups: dataset.groups,
  rules: dataset.rules,
  territoryRules: dataset.territory_rules,
};

const nameOf = (iso3: string) => dataset.countries[iso3] ?? iso3;

describe("precomputed next-visa shards", () => {
  const sample = ["IND", "NGA", "PHL", "CHN", "PAK", "USA", "DEU", "XKX", "ISR", "BRA"];

  it.each(sample)("%s matches a fresh ranking at its as_of date", (iso3) => {
    const file = shard(iso3);
    const fresh = rankPresets(
      iso3,
      [],
      new Date(`${file.next_visa_as_of}T00:00:00.000Z`),
      data,
      presetDocuments,
      nameOf,
    );
    expect(file.next_visa).toEqual(fresh);
  });

  it("covers every preset for every passport", () => {
    for (const iso3 of sample) {
      const file = shard(iso3);
      expect(file.next_visa).toHaveLength(presetDocuments.length);
      expect(new Set(file.next_visa.map(presetKey))).toEqual(
        new Set(presetDocuments.map((p) => presetKey(p.doc))),
      );
    }
  });

  it("is sorted by new easy access, descending", () => {
    for (const iso3 of sample) {
      const counts = shard(iso3).next_visa.map((g) => g.new_easy_access);
      expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    }
  });

  it("stores at most five destinations, all of them real countries", () => {
    for (const iso3 of sample) {
      for (const gain of shard(iso3).next_visa) {
        expect(gain.top.length).toBeLessThanOrEqual(5);
        expect(gain.top.length).toBeLessThanOrEqual(gain.unlocked);
        for (const dest of gain.top) expect(dataset.countries[dest], dest).toBeDefined();
      }
    }
  });

  it("agrees with the golden case: a US visa adds 31 easy-access countries for India", () => {
    const us = shard("IND").next_visa.find((g) => g.issuer === "USA" && g.type === "visa");
    expect(us?.new_easy_access).toBe(31);
  });

  it("never suggests a document the traveller already holds", () => {
    const held = [{ issuer: "USA", type: "visa" as const }];
    const ranked = rankPresets("IND", held, new Date("2026-10-16"), data, presetDocuments, nameOf);
    expect(ranked.find((g) => g.issuer === "USA" && g.type === "visa")).toBeUndefined();
    expect(ranked).toHaveLength(presetDocuments.length - 1);
  });

  it("ranks by what a preset adds on top of documents already held", () => {
    const alone = rankPresets("IND", [], new Date("2026-10-16"), data, presetDocuments, nameOf);
    const withUs = rankPresets(
      "IND",
      [{ issuer: "USA", type: "visa" }],
      new Date("2026-10-16"),
      data,
      presetDocuments,
      nameOf,
    );
    const schengenAlone = alone.find((g) => g.issuer === "SCHENGEN")!;
    const schengenOnTop = withUs.find((g) => g.issuer === "SCHENGEN")!;
    // A US visa already covers some of what a Schengen visa would add.
    expect(schengenOnTop.new_easy_access).toBeLessThan(schengenAlone.new_easy_access);
  });

  it('"Try it" adds the preset to the documents already in the URL', () => {
    const held = parseDocs("USA-visa");
    const gain = shard("IND").next_visa.find((g) => g.issuer === "SCHENGEN")!;
    const href = resultsHref({
      passport: "IND",
      docs: [...held, { issuer: gain.issuer, type: gain.type }],
      date: undefined,
    });
    expect(href).toBe("/results?p=IND&d=USA-visa%2CSCHENGEN-visa");
    // ...and that URL parses back to both documents.
    const url = new URL(href, "https://example.test");
    expect(parseDocs(url.searchParams.get("d") ?? undefined)).toEqual([
      { issuer: "USA", type: "visa" },
      { issuer: "SCHENGEN", type: "visa" },
    ]);
  });

  it("carries an explicit travel date through to the Try it link", () => {
    const href = resultsHref({
      passport: "IND",
      docs: [{ issuer: "USA", type: "visa" }],
      date: "2026-11-01",
    });
    expect(href).toBe("/results?p=IND&d=USA-visa&date=2026-11-01");
  });
});
