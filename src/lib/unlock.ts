import { REQUIREMENT_RANK } from "./data/enrich";
import type {
  BaseRequirement,
  DocType,
  Grant,
  Groups,
  Rule,
  TerritoryRule,
} from "./data/schema";

/**
 * The canonical unlock engine: one pure function over the real dataset.
 *
 * Rule order, straight from meta.matching_logic in the dataset:
 *   1. start from the base requirement;
 *   2. keep rules active on travelDate (valid_from / valid_until);
 *   3. keep rules whose nat matches the passport ({list} or {all, except});
 *   4. a held document matches a doc spec when its issuer is in the expanded
 *      issuer list (a held group code needs the group or all of its members)
 *      and its type is listed, where permanent_residence also
 *      satisfies residence_permit, and documents issued by the destination
 *      itself are ignored;
 *   5. upgrade only when the grant outranks the base;
 *   6. transit grants, `partial` rules and group destinations (dest
 *      "SCHENGEN") are sidelined into `notes` and never counted.
 */

export type Iso3 = string;

export interface HeldDocument {
  /** ISO3 country code, or a group code the dataset defines (e.g. SCHENGEN). */
  issuer: string;
  type: DocType;
}

/**
 * The slice of the dataset the engine needs. Passed in rather than imported so
 * the function stays pure and so the 965 kB source never reaches a bundle;
 * `withDataset` below recovers the plain three-argument signature.
 */
export interface UnlockData {
  /**
   * Destination ISO3 -> already-normalised requirement for this passport. This
   * is exactly the shape of public/data/passports/{ISO3}.json, so the browser
   * feeds a fetched shard straight in.
   */
  baseFor: (passport: Iso3) => Record<Iso3, BaseRequirement> | undefined;
  /** Optional day counts the base matrix stated, same keying as `baseFor`. */
  visaFreeDaysFor?: (passport: Iso3) => Record<Iso3, number> | undefined;
  groups: Groups;
  rules: readonly Rule[];
  territoryRules?: readonly TerritoryRule[];
}

export interface DestinationResult {
  dest: Iso3;
  base: BaseRequirement;
  withDocs: BaseRequirement;
  rule?: Rule;
  matchedDoc?: HeldDocument;
  unlocked: boolean;
  /** Days of visa-free stay the base matrix stated, when it gave a number. */
  baseVisaFreeDays?: number;
}

/** A rule that matched but is never counted: transit, partial or group-wide. */
export interface SidelinedRule {
  rule: Rule | TerritoryRule;
  matchedDoc: HeldDocument;
  reason: "transit" | "partial" | "group_destination" | "territory";
}

export interface TravelPower {
  destinations: DestinationResult[];
  counts: Record<BaseRequirement, { base: number; withDocs: number }>;
  easyAccess: { base: number; withDocs: number };
  /** Destinations that became easy access only because of a held document. */
  newEasyAccess: DestinationResult[];
  /** How many destinations a rule upgraded. */
  unlocked: number;
  /** Transit, partial and group-destination matches, listed but never counted. */
  notes: SidelinedRule[];
}

const EASY_ACCESS: readonly BaseRequirement[] = ["visa_free", "eta", "visa_on_arrival"];

export const isEasyAccess = (r: BaseRequirement): boolean => EASY_ACCESS.includes(r);

const GRANT_TO_REQUIREMENT: Record<Exclude<Grant, "transit">, BaseRequirement> = {
  visa_free: "visa_free",
  eta: "eta",
  visa_on_arrival: "visa_on_arrival",
  e_visa: "e_visa",
};

/** Group destinations are area-wide and never attach to a single country. */
const GROUP_DESTINATION = "SCHENGEN";

export function isRuleActive(rule: Rule | TerritoryRule, travelDate: Date): boolean {
  const day = travelDate.toISOString().slice(0, 10);
  if (rule.valid_from && day < rule.valid_from) return false;
  if (rule.valid_until && day > rule.valid_until) return false;
  return true;
}

/** meta.nat_semantics: either {list} or {all, except}, never both. */
export function nationalityMatches(rule: Rule | TerritoryRule, passport: Iso3): boolean {
  if ("list" in rule.nat) return rule.nat.list.includes(passport);
  return !rule.nat.except.includes(passport);
}

function expandIssuers(issuers: readonly string[], groups: Groups): Set<string> {
  const out = new Set<string>();
  for (const code of issuers) {
    out.add(code);
    for (const member of groups[code] ?? []) out.add(member);
  }
  return out;
}

/**
 * A held group document (e.g. a SCHENGEN residence permit) could have been
 * issued by any member, so it only matches when the rule accepts every one of
 * them: the group code itself, or all its members listed or implied.
 */
function issuerAccepted(issuer: string, accepted: ReadonlySet<string>, groups: Groups): boolean {
  if (accepted.has(issuer)) return true;
  const members = groups[issuer];
  return members !== undefined && members.length > 0 && members.every((m) => accepted.has(m));
}

export function findMatchingDocument(
  rule: Rule | TerritoryRule,
  held: readonly HeldDocument[],
  groups: Groups,
  dest?: Iso3,
): HeldDocument | undefined {
  for (const doc of held) {
    // A destination's own document never unlocks that destination.
    if (dest !== undefined && doc.issuer === dest) continue;
    for (const spec of rule.docs) {
      const typeOk =
        spec.types.includes(doc.type) ||
        (doc.type === "permanent_residence" && spec.types.includes("residence_permit"));
      if (!typeOk) continue;
      if (issuerAccepted(doc.issuer, expandIssuers(spec.issuers, groups), groups)) return doc;
    }
  }
  return undefined;
}

function sidelineReason(rule: Rule | TerritoryRule): SidelinedRule["reason"] | undefined {
  if (!("dest" in rule)) return "territory";
  if (rule.grant === "transit") return "transit";
  if (rule.partial === true) return "partial";
  if (rule.dest === GROUP_DESTINATION) return "group_destination";
  return undefined;
}

export function computeTravelPower(
  passport: Iso3,
  held: readonly HeldDocument[],
  travelDate: Date,
  data: UnlockData,
): TravelPower {
  const row = data.baseFor(passport);
  if (!row) throw new Error(`No base matrix row for passport ${passport}`);
  const { groups } = data;

  const counts = Object.fromEntries(
    (Object.keys(REQUIREMENT_RANK) as BaseRequirement[]).map((r) => [r, { base: 0, withDocs: 0 }]),
  ) as TravelPower["counts"];

  const notes: SidelinedRule[] = [];
  const everyRule: readonly (Rule | TerritoryRule)[] = [
    ...data.rules,
    ...(data.territoryRules ?? []),
  ];

  for (const rule of everyRule) {
    const reason = sidelineReason(rule);
    if (!reason) continue;
    if (!isRuleActive(rule, travelDate) || !nationalityMatches(rule, passport)) continue;
    const dest = "dest" in rule ? rule.dest : undefined;
    const matchedDoc = findMatchingDocument(rule, held, groups, dest);
    if (matchedDoc) notes.push({ rule, matchedDoc, reason });
  }

  // Index the countable rules by destination so this stays one pass per rule.
  const byDest = new Map<Iso3, Rule[]>();
  for (const rule of data.rules) {
    if (sidelineReason(rule)) continue;
    const list = byDest.get(rule.dest);
    if (list) list.push(rule);
    else byDest.set(rule.dest, [rule]);
  }

  const days = data.visaFreeDaysFor?.(passport);
  const destinations: DestinationResult[] = [];
  for (const [dest, base] of Object.entries(row)) {
    if (base === "home") continue;
    const visaFreeDays = days?.[dest];

    let result: DestinationResult = {
      dest,
      base,
      withDocs: base,
      unlocked: false,
      ...(visaFreeDays !== undefined ? { baseVisaFreeDays: visaFreeDays } : {}),
    };

    for (const rule of byDest.get(dest) ?? []) {
      if (!isRuleActive(rule, travelDate) || !nationalityMatches(rule, passport)) continue;
      const matchedDoc = findMatchingDocument(rule, held, groups, dest);
      if (!matchedDoc) continue;
      const granted = GRANT_TO_REQUIREMENT[rule.grant as Exclude<Grant, "transit">];
      if (REQUIREMENT_RANK[granted] > REQUIREMENT_RANK[result.withDocs]) {
        result = { ...result, withDocs: granted, rule, matchedDoc, unlocked: true };
      }
    }

    destinations.push(result);
    counts[result.base].base++;
    counts[result.withDocs].withDocs++;
  }

  const newEasyAccess = destinations.filter((r) => isEasyAccess(r.withDocs) && !isEasyAccess(r.base));

  return {
    destinations,
    counts,
    easyAccess: {
      base: destinations.filter((r) => isEasyAccess(r.base)).length,
      withDocs: destinations.filter((r) => isEasyAccess(r.withDocs)).length,
    },
    newEasyAccess,
    unlocked: destinations.filter((r) => r.unlocked).length,
    notes,
  };
}

/** Binds a dataset, recovering the plain computeTravelPower(passport, held, travelDate). */
export const withDataset =
  (data: UnlockData) =>
  (passport: Iso3, held: readonly HeldDocument[], travelDate: Date): TravelPower =>
    computeTravelPower(passport, held, travelDate, data);
