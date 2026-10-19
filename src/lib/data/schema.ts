import { z } from "zod";

/**
 * Zod schemas for data/visa-unlock-dataset.json, the single source of truth.
 *
 * Two semantics from the dataset's own `meta` block drive these shapes:
 *
 * meta.nat_semantics — "{'list': [...]} applies only to those passports.
 *   {'all': true, 'except': [...]} applies to any passport not listed; it only
 *   matters where it beats the base status."
 *   So `nat` is a discriminated union of exactly those two forms, never both.
 *
 * meta.matching_logic — "A held document (issuer ISO3, type) matches a rule doc
 *   spec if issuer is in the expanded issuer list (groups expanded) and the type
 *   is listed; a held permanent_residence also satisfies residence_permit. A rule
 *   upgrades passport P at destination D if P qualifies, a held document matches,
 *   the rule is active on the travel date, and the grant ranks above P's base
 *   status at D."
 *   So a rule's `docs` is a list of alternatives (any one may match), each a set
 *   of issuers x types, and issuers may be group codes that need expanding.
 */

export const DEFAULT_LAST_VERIFIED = "2026-10-19";

/** ISO 3166-1 alpha-3, or a group/pseudo code such as SCHENGEN, EU, ANY. */
export const CodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{1,14}$/, "expected an upper-case ISO3 or group code");
export const Iso3Schema = z.string().regex(/^[A-Z]{3}$/, "expected an ISO 3166-1 alpha-3 code");
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected a YYYY-MM-DD date");
export const UrlSchema = z.string().url();

export const DocTypeSchema = z.enum(["visa", "residence_permit", "permanent_residence"]);
export const GrantSchema = z.enum(["visa_free", "eta", "visa_on_arrival", "e_visa", "transit"]);
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);

/** Raw base-matrix cell: a status word, a number of visa-free days, or "-1" for the home country. */
export const RawBaseValueSchema = z.union([
  z.enum(["visa free", "eta", "visa on arrival", "e-visa", "visa required", "no admission", "-1"]),
  z.string().regex(/^\d+$/, "expected a number of visa-free days"),
]);

/** Normalised form the data layer emits. */
export const BaseRequirementSchema = z.enum([
  "visa_free",
  "eta",
  "visa_on_arrival",
  "e_visa",
  "visa_required",
  "no_admission",
  "home",
]);

export const MetaSchema = z.object({
  title: z.string(),
  researched_on: IsoDateSchema,
  base_matrix_source: z.string(),
  rules_source: z.string(),
  accuracy_note: z.string(),
  document_types: z.record(DocTypeSchema, z.string()),
  nat_semantics: z.string(),
  grant_values: z.array(GrantSchema),
  status_rank: z.record(z.string(), z.number()),
  matching_logic: z.string(),
});

/** iso3 -> display name. */
export const CountriesSchema = z.record(Iso3Schema, z.string().min(1));

/** Group code -> member ISO3 codes (SCHENGEN, EU, EEA, GCC). */
export const GroupsSchema = z.record(CodeSchema, z.array(Iso3Schema).nonempty());

/** passport iso3 -> destination iso3 -> raw requirement. */
export const BaseMatrixSchema = z.record(Iso3Schema, z.record(Iso3Schema, RawBaseValueSchema));

/** See meta.nat_semantics. */
export const NatSchema = z.union([
  z.object({ list: z.array(Iso3Schema).nonempty() }).strict(),
  z.object({ all: z.literal(true), except: z.array(Iso3Schema) }).strict(),
]);

/** One alternative set of acceptable documents; see meta.matching_logic. */
export const DocSpecSchema = z
  .object({
    issuers: z.array(CodeSchema).nonempty(),
    types: z.array(DocTypeSchema).nonempty(),
  })
  .strict();

const ruleShape = {
  id: z.string().min(1),
  nat: NatSchema,
  docs: z.array(DocSpecSchema).nonempty(),
  doc_conditions: z.string().min(1),
  grant: GrantSchema,
  max_stay_days: z.number().int().nonnegative().nullable(),
  confidence: ConfidenceSchema,
  sources: z.array(UrlSchema).nonempty(),
  notes: z.string(),
  valid_from: IsoDateSchema.optional(),
  valid_until: IsoDateSchema.optional(),
  partial: z.literal(true).optional(),
  /** Added by the data layer; defaults to the dataset's research date. */
  last_verified: IsoDateSchema.default(DEFAULT_LAST_VERIFIED),
};

/**
 * A rule keyed by destination. `dest` is usually an ISO3 country, but may be a
 * group code: the dataset's SCH-ATV rule applies to the Schengen area as a
 * whole. build-data.ts checks every dest resolves to a country or a group.
 */
export const RuleSchema = z.object({ ...ruleShape, dest: CodeSchema }).strict();

/** A rule for a non-sovereign territory, keyed by name rather than ISO3. */
export const TerritoryRuleSchema = z.object({ ...ruleShape, dest_name: z.string().min(1) }).strict();

export const WarningSchema = z
  .object({ dest: Iso3Schema, text: z.string().min(1), source: UrlSchema })
  .strict();

export const CoverageSchema = z
  .object({
    rules_found: z.array(CodeSchema),
    checked_no_rule: z.array(CodeSchema),
    not_individually_checked: z.array(CodeSchema),
  })
  .strict();

/** How a traveller applies for entry to one destination, and its official portal. */
export const ApplyInfoSchema = z
  .object({
    how_to_apply: z.string().min(1),
    /** Absent where no official online page could be found. */
    official_url: UrlSchema.startsWith("https://").optional(),
    /** Set when the link was opened and checked by hand on that date. */
    confirmed_on: IsoDateSchema.optional(),
  })
  .strict();

/** destination iso3 -> how to apply. */
export const ApplySchema = z.record(Iso3Schema, ApplyInfoSchema);

export const DatasetSchema = z
  .object({
    meta: MetaSchema,
    countries: CountriesSchema,
    groups: GroupsSchema,
    base_matrix: BaseMatrixSchema,
    rules: z.array(RuleSchema).nonempty(),
    territory_rules: z.array(TerritoryRuleSchema),
    warnings: z.array(WarningSchema),
    coverage: CoverageSchema,
    apply: ApplySchema,
  })
  .strict();

export type Meta = z.infer<typeof MetaSchema>;
export type Countries = z.infer<typeof CountriesSchema>;
export type Groups = z.infer<typeof GroupsSchema>;
export type BaseMatrix = z.infer<typeof BaseMatrixSchema>;
export type RawBaseValue = z.infer<typeof RawBaseValueSchema>;
export type BaseRequirement = z.infer<typeof BaseRequirementSchema>;
export type Nat = z.infer<typeof NatSchema>;
export type DocSpec = z.infer<typeof DocSpecSchema>;
export type DocType = z.infer<typeof DocTypeSchema>;
export type Grant = z.infer<typeof GrantSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type TerritoryRule = z.infer<typeof TerritoryRuleSchema>;
export type Warning = z.infer<typeof WarningSchema>;
export type Coverage = z.infer<typeof CoverageSchema>;
export type ApplyInfo = z.infer<typeof ApplyInfoSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
