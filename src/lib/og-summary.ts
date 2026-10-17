import { presetDocuments } from "./documents";
import type { HeldDocument } from "./unlock";

/** "Countries this passport opens with a US visa and an EU residence permit" */
export function docSummary(docs: readonly HeldDocument[]): string {
  if (!docs.length) return "What this passport opens on its own";
  const labels = docs.map((d) => {
    const preset = presetDocuments.find((p) => p.doc.issuer === d.issuer && p.doc.type === d.type);
    return preset?.label ?? `${d.issuer} ${d.type.replace(/_/g, " ")}`;
  });
  const joined =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
  return `Countries this passport opens with a ${joined}`;
}
