import type { EnrichedCountry } from "./enrich";
import { toCountryView, type CountryView } from "./types";

/**
 * Narrows the generated country records to the fields the browser renders.
 * Slugs and demonyms are only used by the server-rendered landing pages, so
 * they never reach the client payload.
 */
export function countryViews(
  countries: Record<string, EnrichedCountry>,
): Record<string, CountryView> {
  const out: Record<string, CountryView> = {};
  for (const [iso3, c] of Object.entries(countries)) out[iso3] = toCountryView(c);
  return out;
}
