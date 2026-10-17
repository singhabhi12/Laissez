import { REQUIREMENT_RANK } from "./data/enrich";
import type { DocType } from "./data/schema";
import { computeTravelPower, isEasyAccess, type HeldDocument, type UnlockData } from "./unlock";

/** What one preset document would add on top of what the traveller already holds. */
export interface PresetGain {
  issuer: string;
  type: DocType;
  /** Destinations that become easy access only because of this document. */
  new_easy_access: number;
  /** Destinations this document upgrades at all. */
  unlocked: number;
  /** Up to five of those destinations, best first (ISO3). */
  top: string[];
}

export const presetKey = (d: { issuer: string; type: DocType }) => `${d.issuer}-${d.type}`;

/**
 * Ranks preset documents by what each one adds. Shared by scripts/build-data.ts
 * (precomputing the no-documents case for every passport) and by the browser
 * (when the traveller already holds documents), so both agree exactly.
 */
export function rankPresets(
  passport: string,
  held: readonly HeldDocument[],
  travelDate: Date,
  data: UnlockData,
  presets: readonly { doc: HeldDocument }[],
  nameOf: (iso3: string) => string,
): PresetGain[] {
  const current = computeTravelPower(passport, held, travelDate, data);
  const alreadyUnlocked = new Set(current.destinations.filter((d) => d.unlocked).map((d) => d.dest));
  const alreadyEasy = new Set(
    current.destinations.filter((d) => isEasyAccess(d.withDocs)).map((d) => d.dest),
  );
  const heldKeys = new Set(held.map(presetKey));

  return presets
    .filter((p) => !heldKeys.has(presetKey(p.doc)))
    .map(({ doc }) => {
      const next = computeTravelPower(passport, [...held, doc], travelDate, data);
      const gained = next.destinations.filter((d) => d.unlocked && !alreadyUnlocked.has(d.dest));
      const newEasy = next.destinations.filter(
        (d) => isEasyAccess(d.withDocs) && !alreadyEasy.has(d.dest),
      );

      // Best first: the ones that became easy access, then by requirement rank,
      // then alphabetically so the chips are stable between builds.
      const top = [...gained]
        .sort(
          (a, b) =>
            Number(isEasyAccess(b.withDocs)) - Number(isEasyAccess(a.withDocs)) ||
            REQUIREMENT_RANK[b.withDocs] - REQUIREMENT_RANK[a.withDocs] ||
            nameOf(a.dest).localeCompare(nameOf(b.dest)),
        )
        .slice(0, 5)
        .map((d) => d.dest);

      return {
        issuer: doc.issuer,
        type: doc.type,
        new_easy_access: newEasy.length,
        unlocked: gained.length,
        top,
      };
    })
    .sort(
      (a, b) =>
        b.new_easy_access - a.new_easy_access ||
        b.unlocked - a.unlocked ||
        a.issuer.localeCompare(b.issuer),
    );
}
