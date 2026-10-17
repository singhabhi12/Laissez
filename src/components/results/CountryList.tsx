"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "@/components/DataProvider";
import { REGIONS } from "@/lib/data/enrich";
import type { BaseRequirement } from "@/lib/data/schema";
import { STATUS_ORDER, statusLabel } from "@/lib/status";
import type { DestinationResult } from "@/lib/unlock";
import { StatusPill, UnlockedTag } from "@/components/StatusPill";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CountryList({
  results,
  onSelect,
}: {
  results: DestinationResult[];
  onSelect: (iso3: string) => void;
}) {
  const { country } = useData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | BaseRequirement>("all");
  const [region, setRegion] = useState("all");
  const [unlockedOnly, setUnlockedOnly] = useState(false);

  const filtered = useMemo(
    () =>
      results.filter((r) => {
        const c = country(r.dest);
        if (!c) return false;
        if (q) {
          const needle = q.toLowerCase();
          if (!c.name.toLowerCase().includes(needle) && !c.iso3.toLowerCase().includes(needle)) return false;
        }
        if (status !== "all" && r.withDocs !== status) return false;
        if (region !== "all" && c.region !== region) return false;
        if (unlockedOnly && !r.unlocked) return false;
        return true;
      }),
    [results, q, status, region, unlockedOnly, country],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative flex-1 sm:min-w-[220px]">
          <span className="sr-only">Search countries</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-11 w-full rounded-xl bg-grouped pl-9 pr-3 text-body outline-none placeholder:text-muted-foreground"
          />
        </label>
        <div className="flex gap-3">
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="h-11 min-w-[150px] rounded-xl bg-grouped border-0" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="h-11 min-w-[150px] rounded-xl bg-grouped border-0" aria-label="Filter by region"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-11 items-center gap-3 text-[15px]">
          <Switch checked={unlockedOnly} onCheckedChange={setUnlockedOnly} aria-label="Unlocked only" />
          Unlocked only
        </label>
      </div>

      {STATUS_ORDER.map((s) => {
        const rows = filtered
          .filter((r) => r.withDocs === s)
          .sort(
            (a, b) =>
              Number(b.unlocked) - Number(a.unlocked) ||
              (country(a.dest)?.name ?? "").localeCompare(country(b.dest)?.name ?? ""),
          );
        if (!rows.length) return null;
        return (
          <section key={s} aria-labelledby={`grp-${s}`}>
            <h3 id={`grp-${s}`} className="mb-2 px-4 text-caption uppercase tracking-wide text-muted-foreground">
              {statusLabel[s]} <span className="tnum">· {rows.length}</span>
            </h3>
            <ul className="overflow-hidden rounded-xl bg-grouped">
              <AnimatePresence initial={false}>
                {rows.map((r, i) => {
                  const c = country(r.dest)!;
                  return (
                    <motion.li key={r.dest} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button
                        type="button"
                        onClick={() => onSelect(r.dest)}
                        className={`flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-secondary ${i ? "border-t border-border" : ""}`}
                      >
                        <span aria-hidden className="text-2xl">{c.flagEmoji}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                          <span className="truncate">{c.name}</span>
                          <span className="flex flex-wrap items-center gap-2">
                            <StatusPill status={r.withDocs} />
                            {r.unlocked && <UnlockedTag />}
                          </span>
                        </span>
                        {r.rule?.max_stay_days ? (
                          <span className="tnum hidden text-caption text-muted-foreground sm:inline">Up to {r.rule.max_stay_days} days</span>
                        ) : null}
                        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
      {!filtered.length && <p className="py-12 text-center text-muted-foreground">No countries match these filters.</p>}
    </div>
  );
}
