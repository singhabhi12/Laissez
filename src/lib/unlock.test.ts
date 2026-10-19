import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatasetSchema, type BaseRequirement } from "./data/schema";
import { normaliseBase } from "./data/enrich";
import {
  computeTravelPower,
  findMatchingDocument,
  withDataset,
  type HeldDocument,
  type TravelPower,
  type UnlockData,
} from "./unlock";

const dataset = DatasetSchema.parse(
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, "../../data/visa-unlock-dataset.json"), "utf8"),
  ),
);

/** Normalise the raw dataset rows the way scripts/build-data.ts does. */
const normalisedRows = new Map<string, Record<string, BaseRequirement>>();
const daysRows = new Map<string, Record<string, number>>();
for (const [passport, row] of Object.entries(dataset.base_matrix)) {
  const base: Record<string, BaseRequirement> = {};
  const days: Record<string, number> = {};
  for (const [dest, raw] of Object.entries(row)) {
    const n = normaliseBase(raw);
    base[dest] = n.requirement;
    if (n.visaFreeDays !== undefined) days[dest] = n.visaFreeDays;
  }
  normalisedRows.set(passport, base);
  daysRows.set(passport, days);
}

const data: UnlockData = {
  baseFor: (passport) => normalisedRows.get(passport),
  visaFreeDaysFor: (passport) => daysRows.get(passport),
  groups: dataset.groups,
  rules: dataset.rules,
  territoryRules: dataset.territory_rules,
};

/** Any date on or after UZB-1's valid_from (2026-09-01). */
const TODAY = new Date("2026-10-16");
/** Any date before it. */
const BEFORE_UZB = new Date("2026-08-31");

const power = withDataset(data);

const US_VISA: HeldDocument = { issuer: "USA", type: "visa" };
const UK_VISA: HeldDocument = { issuer: "GBR", type: "visa" };
const SCHENGEN_VISA: HeldDocument = { issuer: "SCHENGEN", type: "visa" };
const GREEN_CARD: HeldDocument = { issuer: "USA", type: "permanent_residence" };

const at = (r: TravelPower, dest: string) => r.destinations.find((x) => x.dest === dest)!;

describe("computeTravelPower — golden cases", () => {
  it("India with no documents has 54 easy-access destinations", () => {
    const r = power("IND", [], TODAY);
    expect(r.easyAccess.withDocs).toBe(54);
    expect(r.newEasyAccess).toHaveLength(0);
    expect(r.unlocked).toBe(0);
    // No documents, so nothing can be upgraded away from the base.
    expect(r.easyAccess.base).toBe(54);
  });

  it("India + US visa unlocks Mexico and Uzbekistan, 31 new easy access", () => {
    const r = power("IND", [US_VISA], TODAY);

    expect(at(r, "MEX").withDocs).toBe("visa_free");
    expect(at(r, "MEX").rule?.id).toBe("MEX-1");
    expect(at(r, "MEX").rule?.max_stay_days).toBe(180);

    expect(at(r, "UZB").withDocs).toBe("visa_free");
    expect(at(r, "UZB").rule?.id).toBe("UZB-1");
    expect(at(r, "UZB").rule?.max_stay_days).toBe(30);

    // Indians are visa free in the Philippines in the base matrix (14 days), so
    // PHL-1's 30 days does not outrank it and is not counted as an unlock.
    expect(at(r, "PHL").base).toBe("visa_free");
    expect(at(r, "PHL").withDocs).toBe("visa_free");
    expect(at(r, "PHL").unlocked).toBe(false);

    expect(r.newEasyAccess).toHaveLength(31);
  });

  /**
   * 121 holds only before UZB-1 activates on 2026-09-01; on or after that
   * date Uzbekistan is also easy access, making 122. Both dates are pinned so the boundary cannot regress silently.
   */
  it("India + US, UK and Schengen visas: 121 easy access before UZB-1, 122 after", () => {
    const held = [US_VISA, UK_VISA, SCHENGEN_VISA];

    const before = power("IND", held, BEFORE_UZB);
    expect(before.easyAccess.withDocs).toBe(121);
    expect(at(before, "UZB").unlocked).toBe(false);

    const after = power("IND", held, TODAY);
    expect(after.easyAccess.withDocs).toBe(122);
    expect(at(after, "UZB").rule?.id).toBe("UZB-1");

    // Uzbekistan is the only destination that differs between the two dates.
    const easy = (r: TravelPower) =>
      r.destinations.filter((x) => ["visa_free", "eta", "visa_on_arrival"].includes(x.withDocs)).map((x) => x.dest);
    expect(easy(after).filter((d) => !easy(before).includes(d))).toEqual(["UZB"]);
  });

  it("ignores the Uzbekistan rule when travelDate is before 2026-09-01", () => {
    const r = power("IND", [US_VISA], BEFORE_UZB);
    expect(at(r, "UZB").rule).toBeUndefined();
    expect(at(r, "UZB").withDocs).toBe("e_visa"); // the untouched base
    expect(at(r, "UZB").unlocked).toBe(false);
    expect(r.newEasyAccess).toHaveLength(30);
  });

  it("Nigeria + Schengen visa: Schengen members visa free, Cyprus via CYP-1", () => {
    const r = power("NGA", [SCHENGEN_VISA], TODAY);

    for (const member of ["DEU", "FRA", "ITA", "ESP", "NLD"]) {
      expect(at(r, member).withDocs, member).toBe("visa_free");
      expect(at(r, member).unlocked, member).toBe(true);
    }

    expect(at(r, "CYP").withDocs).toBe("visa_free");
    expect(at(r, "CYP").rule?.id).toBe("CYP-1");
  });

  it("a US green card satisfies a rule that asks for a residence permit", () => {
    const r = power("IND", [GREEN_CARD], TODAY);
    const viaResidencePermit = r.destinations.filter(
      (x) =>
        x.rule?.docs.some(
          (spec) => spec.types.includes("residence_permit") && !spec.types.includes("permanent_residence"),
        ) && x.matchedDoc?.type === "permanent_residence",
    );
    expect(viaResidencePermit.length).toBeGreaterThan(0);
    expect(at(r, "ALB").rule?.id).toBe("ALB-1");
    expect(at(r, "ALB").withDocs).toBe("visa_free");
  });

  it("a destination's own document never unlocks that destination", () => {
    // MEX-1 accepts a US visa, so Mexico is unlocked for a US visa holder...
    expect(at(power("IND", [US_VISA], TODAY), "MEX").rule?.id).toBe("MEX-1");
    // ...but a Mexican visa must never unlock Mexico itself.
    const own = power("IND", [{ issuer: "MEX", type: "visa" }], TODAY);
    expect(at(own, "MEX").unlocked).toBe(false);
    expect(at(own, "MEX").withDocs).toBe(at(own, "MEX").base);

    // Nor may a Schengen visa unlock a Schengen member through that member's
    // own rule when the document is that very country's.
    const deu = power("NGA", [{ issuer: "DEU", type: "visa" }], TODAY);
    expect(at(deu, "DEU").unlocked).toBe(false);
  });

  it("a Schengen residence permit matches only rules that accept every Schengen state", () => {
    const permit: HeldDocument[] = [{ issuer: "SCHENGEN", type: "residence_permit" }];
    const rule = (id: string) => dataset.rules.find((r) => r.id === id)!;
    const matches = (id: string) => findMatchingDocument(rule(id), permit, dataset.groups) !== undefined;

    // Names the group itself.
    expect(matches("ALB-1")).toBe(true);
    // Lists all 29 members one by one (GEO-1), or covers them as EEA + CHE (GBR-2).
    expect(matches("GEO-1")).toBe(true);
    expect(matches("GBR-2")).toBe(true);
    // EU + ISL + NOR + CHE leaves out Liechtenstein; EU alone leaves out four.
    expect(matches("CRI-1")).toBe(false);
    expect(matches("ARE-1")).toBe(false);
  });

  it("a Schengen residence permit unlocks far more than the EU group code does", () => {
    const schengen = power("IND", [{ issuer: "SCHENGEN", type: "residence_permit" }], TODAY);
    const eu = power("IND", [{ issuer: "EU", type: "residence_permit" }], TODAY);
    expect(schengen.unlocked).toBeGreaterThan(eu.unlocked * 5);
  });
});

describe("computeTravelPower — rule handling", () => {
  it("never counts transit, partial or group-destination rules", () => {
    const r = power("IND", [US_VISA, SCHENGEN_VISA], TODAY);
    for (const note of r.notes) {
      expect(["transit", "partial", "group_destination", "territory"]).toContain(note.reason);
      if ("dest" in note.rule && note.rule.dest !== "SCHENGEN") {
        // A sidelined rule must not be the rule credited at its destination.
        expect(at(r, note.rule.dest).rule?.id).not.toBe(note.rule.id);
      }
    }
    // IDN-1 is the dataset's only `partial` rule and must stay out of the count.
    expect(r.destinations.find((x) => x.rule?.id === "IDN-1")).toBeUndefined();
    // SCH-ATV is transit and area-wide; it may only appear in notes.
    expect(r.destinations.find((x) => x.rule?.id === "SCH-ATV")).toBeUndefined();
  });

  it("only upgrades when the grant outranks the base", () => {
    const r = power("IND", [US_VISA, UK_VISA, SCHENGEN_VISA], TODAY);
    for (const d of r.destinations) {
      if (!d.unlocked) {
        expect(d.withDocs).toBe(d.base);
        continue;
      }
      const rank = { visa_free: 5, eta: 3, visa_on_arrival: 3, e_visa: 2, visa_required: 1, no_admission: 0, home: 6 };
      expect(rank[d.withDocs], `${d.dest} ${d.base}->${d.withDocs}`).toBeGreaterThan(rank[d.base]);
    }
  });

  it("excludes the passport's own country from the destination list", () => {
    const r = power("IND", [], TODAY);
    expect(r.destinations.find((x) => x.dest === "IND")).toBeUndefined();
    expect(r.destinations).toHaveLength(198);
    expect(r.counts.home.base).toBe(0);
  });

  it("is pure: same inputs give the same result and inputs are not mutated", () => {
    const held: HeldDocument[] = [US_VISA];
    const a = computeTravelPower("IND", held, TODAY, data);
    const b = computeTravelPower("IND", held, TODAY, data);
    expect(a.easyAccess).toEqual(b.easyAccess);
    expect(held).toEqual([{ issuer: "USA", type: "visa" }]);
    expect(dataset.rules.find((r) => r.id === "UZB-1")?.valid_from).toBe("2026-09-01");
  });

  it("throws on an unknown passport", () => {
    expect(() => power("ZZZ", [], TODAY)).toThrow(/No base matrix row/);
  });
});
