import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DatasetSchema,
  RuleSchema,
  NatSchema,
  DEFAULT_LAST_VERIFIED,
  type RawBaseValue,
} from "./schema";
import { ISO, flagEmoji } from "./iso";
import { normaliseBase, REGIONS } from "./enrich";

const dataset = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../../../data/visa-unlock-dataset.json"), "utf8"),
) as unknown;

describe("dataset schema", () => {
  it("validates the real dataset", () => {
    const result = DatasetSchema.safeParse(dataset);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues.slice(0, 5))).toBe(true);
  });

  it("stamps last_verified on a rule that has none", () => {
    const parsed = RuleSchema.parse({
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
    });
    expect(parsed.last_verified).toBe(DEFAULT_LAST_VERIFIED);
  });

  // meta.nat_semantics: exactly one of the two forms, never both.
  it("accepts both nat forms and rejects a mixture", () => {
    expect(NatSchema.safeParse({ list: ["IND"] }).success).toBe(true);
    expect(NatSchema.safeParse({ all: true, except: [] }).success).toBe(true);
    expect(NatSchema.safeParse({ list: ["IND"], all: true, except: [] }).success).toBe(false);
    expect(NatSchema.safeParse({ all: false, except: [] }).success).toBe(false);
  });

  it("rejects an unknown grant and a non-url source", () => {
    const base = {
      id: "X-2", dest: "ALB", nat: { list: ["IND"] },
      docs: [{ issuers: ["USA"], types: ["visa"] }],
      doc_conditions: "x", grant: "visa_free", max_stay_days: null,
      confidence: "high", sources: ["https://example.gov"], notes: "",
    };
    expect(RuleSchema.safeParse({ ...base, grant: "teleport" }).success).toBe(false);
    expect(RuleSchema.safeParse({ ...base, sources: ["not-a-url"] }).success).toBe(false);
  });
});

describe("base requirement normalisation", () => {
  const cases: [RawBaseValue, string][] = [
    ["visa free", "visa_free"],
    ["eta", "eta"],
    ["visa on arrival", "visa_on_arrival"],
    ["e-visa", "e_visa"],
    ["visa required", "visa_required"],
    ["no admission", "no_admission"],
    ["-1", "home"],
  ];
  it.each(cases)("maps %s to %s", (raw, expected) => {
    expect(normaliseBase(raw).requirement).toBe(expected);
  });

  it("maps a day count to visa_free and keeps the number", () => {
    expect(normaliseBase("90")).toEqual({ requirement: "visa_free", visaFreeDays: 90 });
    expect(normaliseBase("0")).toEqual({ requirement: "visa_free", visaFreeDays: 0 });
  });

  it("throws on an unrecognised value", () => {
    expect(() => normaliseBase("maybe" as RawBaseValue)).toThrow(/Unrecognised base requirement/);
  });
});

describe("iso3 -> iso2 and region map", () => {
  it("covers every country in the dataset and nothing more", () => {
    const codes = Object.keys((dataset as { countries: Record<string, string> }).countries);
    expect(Object.keys(ISO).sort()).toEqual(codes.sort());
  });

  it("uses only the UI's regions", () => {
    for (const [iso3, [, region]] of Object.entries(ISO)) {
      expect(REGIONS, `${iso3} has region ${region}`).toContain(region);
    }
  });

  it("includes the special cases", () => {
    expect(ISO["XKX"]?.[0]).toBe("XK");
    expect(ISO["TWN"]?.[0]).toBe("TW");
    expect(ISO["HKG"]?.[0]).toBe("HK");
    expect(ISO["MAC"]?.[0]).toBe("MO");
    expect(ISO["PSE"]?.[0]).toBe("PS");
  });

  it("derives flag emoji from regional indicators", () => {
    expect(flagEmoji("IN")).toBe("🇮🇳");
    expect(flagEmoji("GB")).toBe("🇬🇧");
    expect(flagEmoji("XK")).toBe("🇽🇰");
    for (const [, [iso2]] of Object.entries(ISO)) {
      expect([...flagEmoji(iso2)]).toHaveLength(2);
    }
  });
});
