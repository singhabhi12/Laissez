"use client";

import { useState } from "react";
import { ChevronDown, PlaneTakeoff } from "lucide-react";
import { useData } from "@/components/DataProvider";
import type { SidelinedRule } from "@/lib/unlock";

export function TransitBanner({ notes }: { notes: SidelinedRule[] }) {
  const { country, issuerLabel } = useData();
  const [open, setOpen] = useState(false);
  if (!notes.length) return null;

  const title = (note: SidelinedRule): string => {
    const rule = note.rule;
    if (!("dest" in rule)) return rule.dest_name;
    const c = country(rule.dest);
    return c?.name ?? issuerLabel(rule.dest).name;
  };
  const flag = (note: SidelinedRule): string => {
    const rule = note.rule;
    if (!("dest" in rule)) return "🏝️";
    return country(rule.dest)?.flagEmoji ?? issuerLabel(rule.dest).flag;
  };

  return (
    <div className="rounded-xl bg-grouped">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
      >
        <PlaneTakeoff className="size-5 text-link" aria-hidden />
        <span className="flex-1">
          Also: transit and partial benefits in <span className="tnum">{notes.length}</span>{" "}
          {notes.length === 1 ? "place" : "places"}
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul className="border-t border-border px-4 pb-2">
          {notes.map((note) => (
            <li key={note.rule.id} className="flex gap-3 py-3 text-[15px]">
              <span aria-hidden className="text-xl">{flag(note)}</span>
              <span>
                <span className="font-medium">{title(note)}</span>
                <br />
                <span className="text-muted-foreground">{note.rule.doc_conditions}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
