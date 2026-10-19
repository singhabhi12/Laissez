import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatasetSchema, type ApplyInfo } from "./data/schema";
import { applyInfoFor } from "./apply";

const dataset = DatasetSchema.parse(
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, "../../data/visa-unlock-dataset.json"), "utf8"),
  ),
);

const EVISA: ApplyInfo = { how_to_apply: "eVisa", official_url: "https://evisa.example.gov" };

describe("applyInfoFor", () => {
  it("shows how to apply wherever a traveller still has something to apply for", () => {
    for (const status of ["eta", "visa_on_arrival", "e_visa", "visa_required"] as const) {
      expect(applyInfoFor(status, EVISA), status).toBe(EVISA);
    }
  });

  it("hides it where there is nothing to apply for", () => {
    for (const status of ["visa_free", "home", "no_admission"] as const) {
      expect(applyInfoFor(status, EVISA), status).toBeUndefined();
    }
  });

  it("returns nothing for a destination without an entry", () => {
    expect(applyInfoFor("visa_required", undefined)).toBeUndefined();
  });
});

describe("apply links in the dataset", () => {
  it("covers every destination", () => {
    expect(Object.keys(dataset.apply).sort()).toEqual(Object.keys(dataset.countries).sort());
  });

  it("only links to https pages", () => {
    for (const [iso3, info] of Object.entries(dataset.apply)) {
      if (info.official_url) expect(new URL(info.official_url).protocol, iso3).toBe("https:");
    }
  });

  it("rejects a plain http link", () => {
    const bad = { ...dataset, apply: { ...dataset.apply, IND: { how_to_apply: "eVisa", official_url: "http://x.gov" } } };
    expect(DatasetSchema.safeParse(bad).success).toBe(false);
  });
});
