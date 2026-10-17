import type { BaseRequirement, RawBaseValue } from "./schema";

export type Iso3 = string;

export type Region =
  | "Asia"
  | "Europe"
  | "Africa"
  | "North America"
  | "South America"
  | "Middle East"
  | "Oceania";

export const REGIONS: readonly Region[] = [
  "Asia",
  "Europe",
  "Africa",
  "North America",
  "South America",
  "Middle East",
  "Oceania",
];

export interface EnrichedCountry {
  iso3: Iso3;
  iso2: string;
  /** ISO 3166-1 numeric, used to match world-110m TopoJSON feature ids. */
  numeric: string;
  name: string;
  region: Region;
  flagEmoji: string;
  /** URL slug for the landing pages, e.g. "india". Unique across the dataset. */
  slug: string;
  /** e.g. "Indian" */
  demonym: string;
  /** e.g. "Indians", or "British passport holders" for collective adjectives. */
  demonymPlural: string;
}

/** A normalised base-matrix cell. `visaFreeDays` is set only when the dataset gave a day count. */
export interface NormalisedBase {
  requirement: BaseRequirement;
  visaFreeDays?: number;
}

/**
 * Normalise one raw base-matrix value:
 *   a number of days or "visa free" -> visa_free
 *   "eta"                           -> eta
 *   "visa on arrival"               -> visa_on_arrival
 *   "e-visa"                        -> e_visa
 *   "visa required"                 -> visa_required
 *   "no admission"                  -> no_admission
 *   "-1"                            -> home (the passport's own country)
 */
export function normaliseBase(raw: RawBaseValue): NormalisedBase {
  switch (raw) {
    case "visa free":
      return { requirement: "visa_free" };
    case "eta":
      return { requirement: "eta" };
    case "visa on arrival":
      return { requirement: "visa_on_arrival" };
    case "e-visa":
      return { requirement: "e_visa" };
    case "visa required":
      return { requirement: "visa_required" };
    case "no admission":
      return { requirement: "no_admission" };
    case "-1":
      return { requirement: "home" };
    default: {
      const days = Number(raw);
      if (!Number.isInteger(days) || days < 0) {
        throw new Error(`Unrecognised base requirement: ${JSON.stringify(raw)}`);
      }
      return { requirement: "visa_free", visaFreeDays: days };
    }
  }
}

/** Rank from meta.status_rank, extended to the normalised codes. */
export const REQUIREMENT_RANK: Record<BaseRequirement, number> = {
  visa_free: 5,
  eta: 3,
  visa_on_arrival: 3,
  e_visa: 2,
  visa_required: 1,
  no_admission: 0,
  home: 6,
};
