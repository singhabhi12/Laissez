import type { DocType } from "./data/schema";
import type { HeldDocument } from "./unlock";
import { slugify } from "./slugs";

export const docTypeLabel: Record<DocType, string> = {
  visa: "Visa",
  residence_permit: "Residence permit",
  permanent_residence: "Permanent residence",
};

/** The presets from the design, unchanged. `slug` is derived from the label. */
const PRESETS: readonly { label: string; doc: HeldDocument }[] = [
  { label: "US visa", doc: { issuer: "USA", type: "visa" } },
  { label: "UK visa", doc: { issuer: "GBR", type: "visa" } },
  { label: "Schengen visa", doc: { issuer: "SCHENGEN", type: "visa" } },
  { label: "Canada visa", doc: { issuer: "CAN", type: "visa" } },
  { label: "Japan visa", doc: { issuer: "JPN", type: "visa" } },
  { label: "Australia visa", doc: { issuer: "AUS", type: "visa" } },
  { label: "US green card", doc: { issuer: "USA", type: "permanent_residence" } },
  { label: "Canada PR", doc: { issuer: "CAN", type: "permanent_residence" } },
  { label: "UK residence permit", doc: { issuer: "GBR", type: "residence_permit" } },
  { label: "EU residence permit", doc: { issuer: "EU", type: "residence_permit" } },
  { label: "UAE residence permit", doc: { issuer: "ARE", type: "residence_permit" } },
];

export interface PresetDocument {
  label: string;
  slug: string;
  doc: HeldDocument;
}

export const presetDocuments: readonly PresetDocument[] = PRESETS.map((p) => ({
  ...p,
  slug: slugify(p.label),
}));

export const presetBySlug = new Map(presetDocuments.map((p) => [p.slug, p]));

export const docKey = (d: HeldDocument) => `${d.issuer}-${d.type}`;
export const sameDoc = (a: HeldDocument, b: HeldDocument) => docKey(a) === docKey(b);

/** The three examples on the home page. */
export const examples: readonly { label: string; passport: string; docs: HeldDocument[] }[] = [
  { label: "Indian passport + US visa", passport: "IND", docs: [{ issuer: "USA", type: "visa" }] },
  { label: "Nigerian passport + Schengen visa", passport: "NGA", docs: [{ issuer: "SCHENGEN", type: "visa" }] },
  { label: "Philippine passport + Japan visa", passport: "PHL", docs: [{ issuer: "JPN", type: "visa" }] },
];
