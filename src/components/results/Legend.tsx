import { Sparkles } from "lucide-react";
import { StatusIcon } from "@/components/StatusPill";
import type { BaseRequirement } from "@/lib/data/schema";

const items: { label: string; color: string; status?: BaseRequirement }[] = [
  { label: "Visa free", color: "bg-status-free", status: "visa_free" },
  { label: "eTA or visa on arrival", color: "bg-status-eta", status: "eta" },
  { label: "eVisa", color: "bg-status-evisa", status: "e_visa" },
  { label: "Visa required", color: "bg-status-required", status: "visa_required" },
  { label: "Unlocked by your documents", color: "bg-accent" },
  { label: "Your passport", color: "bg-foreground" },
  { label: "No data yet", color: "bg-status-nodata" },
];

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-caption text-muted-foreground" aria-label="Map legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          <span className={`inline-flex size-4 items-center justify-center rounded ${i.color} text-status-ink`} aria-hidden>
            {i.status ? <StatusIcon status={i.status} className="size-2.5" /> : i.color === "bg-accent" ? <Sparkles className="size-2.5 text-accent-foreground" /> : null}
          </span>
          {i.label}
        </li>
      ))}
    </ul>
  );
}
