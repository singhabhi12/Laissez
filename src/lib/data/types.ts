import type { EnrichedCountry, Region } from "./enrich";
import type { PresetGain } from "../next-visa";
import type {
  ApplyInfo,
  BaseRequirement,
  Coverage,
  DocType,
  Groups,
  Rule,
  TerritoryRule,
  Warning,
} from "./schema";

/** Only the country fields the browser actually renders. */
export interface CountryView {
  iso3: string;
  name: string;
  region: Region;
  flagEmoji: string;
}

export const toCountryView = (c: EnrichedCountry): CountryView => ({
  iso3: c.iso3,
  name: c.name,
  region: c.region,
  flagEmoji: c.flagEmoji,
});

/** public/data/countries.json */
export interface CountriesFile {
  generated_from: string;
  countries: Record<string, EnrichedCountry>;
}

/** public/data/iso-numeric.json */
export interface IsoNumericFile {
  byNumeric: Record<string, string>;
  byName: Record<string, string>;
}

/** public/data/rules.json */
export interface RulesFile {
  generated_from: string;
  status_rank: Record<string, number>;
  document_types: Record<DocType, string>;
  groups: Groups;
  rules: Rule[];
  territory_rules: TerritoryRule[];
  warnings: Warning[];
  coverage: Coverage;
  apply: Record<string, ApplyInfo>;
}

/** public/data/passports/{ISO3}.json */
export interface PassportFile {
  passport: string;
  generated_from: string;
  base: Record<string, BaseRequirement>;
  visa_free_days: Record<string, number>;
  /**
   * Preset ranking precomputed for a traveller holding nothing else, valid for
   * `next_visa_as_of`. The browser recomputes when documents are already held
   * or when an explicit travel date is given.
   */
  next_visa_as_of: string;
  next_visa: PresetGain[];
}

/** Everything a screen needs that is shared across passports. */
export interface SharedData {
  countries: CountriesFile;
  rules: RulesFile;
  isoNumeric: IsoNumericFile;
}
