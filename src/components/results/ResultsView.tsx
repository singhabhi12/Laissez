"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { computeTravelPower, type HeldDocument, type UnlockData } from "@/lib/unlock";
import { parseDate, parseDocs, formatDate } from "@/lib/query-state";
import { nextVisaHref, travelQuery } from "@/lib/routes";
import { fetchPassport, primePassport } from "@/lib/data/client";
import type { IsoNumericFile, PassportFile, RulesFile } from "@/lib/data/types";
import { useData } from "@/components/DataProvider";
import { useStoredPassport } from "@/lib/use-stored-passport";
import { useDeferredMount } from "@/lib/use-deferred-mount";
import { PassportPicker } from "@/components/PassportPicker";
import { DocumentPicker } from "@/components/DocumentPicker";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CountCards } from "@/components/results/CountCards";
import { CountryList } from "@/components/results/CountryList";
import { CountryDetail } from "@/components/results/CountryDetail";
import { TransitBanner } from "@/components/results/TransitBanner";
import { Legend } from "@/components/results/Legend";
import { ShareButton } from "@/components/results/ShareButton";
import { events } from "@/lib/analytics";

// react-simple-maps touches the DOM, so the map never renders on the server.
const WorldMap = dynamic(() => import("@/components/results/WorldMap"), {
  ssr: false,
  loading: () => <div className="aspect-[2/1] w-full" />,
});

interface Props {
  initialPassport: string;
  initialDocs: string | undefined;
  initialDate: string | undefined;
  initialShard: PassportFile;
  rules: RulesFile;
  isoNumeric: IsoNumericFile;
}

export function ResultsView({
  initialPassport,
  initialDocs,
  initialDate,
  initialShard,
  rules,
  isoNumeric,
}: Props) {
  const { countries, groups, country } = useData();
  const [, remember] = useStoredPassport();

  const [passport, setPassport] = useState(initialPassport);
  const [docs, setDocs] = useState<HeldDocument[]>(() => parseDocs(initialDocs));
  const [dateParam, setDateParam] = useState(initialDate);
  const [shard, setShard] = useState<PassportFile>(initialShard);
  const [loadError, setLoadError] = useState<string>();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"map" | "list">("map");
  const mapReady = useDeferredMount();
  const [selected, setSelected] = useState<string>();


  // The server already read this passport's shard, so seed the client cache.
  if (typeof window !== "undefined") primePassport(initialShard);

  const travelDate = useMemo(() => parseDate(dateParam), [dateParam]);

  const data = useMemo<UnlockData>(
    () => ({
      baseFor: (p) => (p === shard.passport ? shard.base : undefined),
      visaFreeDaysFor: (p) => (p === shard.passport ? shard.visa_free_days : undefined),
      groups,
      rules: rules.rules,
      territoryRules: rules.territory_rules,
    }),
    [shard, groups, rules],
  );

  const power = useMemo(() => {
    if (shard.passport !== passport) return undefined;
    return computeTravelPower(passport, docs, travelDate, data);
  }, [passport, docs, travelDate, data, shard.passport]);

  const byIso = useMemo(
    () => new Map((power?.destinations ?? []).map((r) => [r.dest, r])),
    [power],
  );
  const openDetail = useCallback(
    (dest: string) => {
      setSelected(dest);
      const result = byIso.get(dest);
      events.ruleOpened({
        destination: dest,
        ruleId: result?.rule?.id ?? null,
        status: result?.withDocs ?? "home",
      });
    },
    [byIso],
  );

  const warningsByDest = useMemo(
    () => Object.fromEntries(rules.warnings.map((w) => [w.dest, w])),
    [rules.warnings],
  );

  /** Writes the URL so back/forward and shared links work, then updates state. */
  const pushUrl = useCallback(
    (nextPassport: string, nextDocs: HeldDocument[], nextDate: string | undefined) => {
      const url = `/results${travelQuery({ passport: nextPassport, docs: nextDocs, date: nextDate })}`;
      window.history.pushState({ p: nextPassport }, "", url);
    },
    [],
  );

  const applyPassport = useCallback(
    (iso3: string, nextDocs: HeldDocument[], nextDate: string | undefined) => {
      setPassport(iso3);
      setDocs(nextDocs);
      setDateParam(nextDate);
      setLoadError(undefined);
      remember(iso3);
      // Loaded on demand: one <5 kB request per passport, cached thereafter.
      fetchPassport(iso3)
        .then((file) => startTransition(() => setShard(file)))
        .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : String(error)));
    },
    [remember],
  );

  const update = useCallback(
    (nextPassport: string, nextDocs: HeldDocument[], nextDate = dateParam) => {
      pushUrl(nextPassport, nextDocs, nextDate);
      applyPassport(nextPassport, nextDocs, nextDate);
    },
    [applyPassport, dateParam, pushUrl],
  );

  // Back and forward replay whatever the URL says.
  useEffect(() => {
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("p");
      applyPassport(
        p && countries[p] ? p : initialPassport,
        parseDocs(params.get("d") ?? undefined),
        params.get("date") ?? undefined,
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyPassport, countries, initialPassport]);

  // One event per distinct result, not per render.
  const viewed = useRef<string>("");
  useEffect(() => {
    if (!power) return;
    const key = `${passport}|${docs.map((d) => `${d.issuer}-${d.type}`).join(",")}|${dateParam ?? ""}`;
    if (viewed.current === key) return;
    viewed.current = key;
    events.resultViewed({
      passport,
      documents: docs.length,
      easyAccess: power.easyAccess.withDocs,
      unlocked: power.unlocked,
    });
  }, [power, passport, docs, dateParam]);

  const homeName = country(passport)?.name ?? passport;
  const dateLabel = dateParam ? formatDate(travelDate) : undefined;

  return (
    <div>
      <div className="glass sticky top-14 z-30 border-b border-border">
        <div className="no-scrollbar mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          <PassportPicker compact value={passport} onChange={(x) => update(x, docs)} />
          <span className="shrink-0 text-muted-foreground" aria-hidden>+</span>
          <div className="flex shrink-0 flex-nowrap">
            <DocumentPicker value={docs} onChange={(nd) => update(passport, nd)} showPresets={false} />
          </div>
          <div className="ml-auto pl-2">
            <ShareButton passport={passport} documents={docs.length} />
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-6">
        {loadError && (
          <p className="rounded-xl bg-grouped p-4 text-[15px] text-destructive" role="alert">
            {loadError}
          </p>
        )}

        <section className="flex flex-col items-start gap-3" aria-live="polite">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Easy access countries</p>
          <div className="flex flex-wrap items-end gap-4">
            <AnimatedNumber
              value={power?.easyAccess.withDocs ?? 0}
              className="text-[88px] font-semibold leading-none tracking-tight"
            />
            <span className="pb-3 text-muted-foreground">
              of {power?.destinations.length ?? 0} in our data
            </span>
          </div>
          <AnimatePresence mode="popLayout">
            {power && power.newEasyAccess.length > 0 && (
              <motion.span
                key={power.newEasyAccess.length}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[15px] font-medium text-primary-foreground"
              >
                <Sparkles className="size-4" aria-hidden />
                <span className="tnum">+{power.newEasyAccess.length}</span> unlocked by your documents
              </motion.span>
            )}
          </AnimatePresence>
          <p className="text-caption text-muted-foreground">
            Visa free, eTA and visa on arrival combined.
            {dateLabel ? ` Rules as they apply on ${dateLabel}.` : ""}
          </p>
        </section>

        {power && <CountCards power={power} />}

        {power && docs.length === 0 && (
          <p className="rounded-xl bg-grouped p-4 text-[15px] text-muted-foreground">
            This is what the {homeName} passport opens on its own. Add a visa, residence permit or
            green card above to see what else it unlocks.
          </p>
        )}
        {power && docs.length > 0 && power.unlocked === 0 && power.notes.length === 0 && (
          <p className="rounded-xl bg-grouped p-4 text-[15px] text-muted-foreground">
            None of your documents change the entry rules for a {homeName} passport. Try a different
            document, or see which one would help most.
          </p>
        )}

        {power && <TransitBanner notes={power.notes} />}

        <section className="flex flex-col gap-6">
          <div role="tablist" aria-label="View" className="inline-flex self-start rounded-full bg-grouped p-1">
            {(["map", "list"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                id={`tab-${v}`}
                aria-selected={view === v}
                aria-controls={`panel-${v}`}
                // Only the selected tab is tabbable; the other is reached with
                // arrow keys, as the tabs pattern requires.
                tabIndex={view === v ? 0 : -1}
                onClick={() => setView(v)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  e.preventDefault();
                  const next = view === "map" ? "list" : "map";
                  setView(next);
                  document.getElementById(`tab-${next}`)?.focus();
                }}
                className={`h-9 min-w-[88px] rounded-full px-4 text-[15px] capitalize transition-all ${view === v ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>

          {view === "map" ? (
            <div id="panel-map" role="tabpanel" aria-labelledby="tab-map" tabIndex={0} className="flex flex-col gap-4">
              <div className="overflow-hidden rounded-xl bg-grouped">
                {mapReady ? (
                  <WorldMap
                    byIso={byIso}
                    passport={passport}
                    isoNumeric={isoNumeric}
                    names={Object.fromEntries(Object.values(countries).map((c) => [c.iso3, c.name]))}
                    onSelect={openDetail}
                  />
                ) : (
                  <div className="aspect-[2/1] w-full" />
                )}
              </div>
              <Legend />
            </div>
          ) : (
            <div id="panel-list" role="tabpanel" aria-labelledby="tab-list" tabIndex={0}>
              <CountryList results={power?.destinations ?? []} onSelect={openDetail} />
            </div>
          )}
        </section>

        <Link
          href={nextVisaHref({ passport, docs, date: dateParam })}
          className="flex min-h-14 items-center justify-between rounded-xl bg-grouped px-4 text-link hover:bg-secondary"
        >
          Which visa should you get next?
          <span aria-hidden>→</span>
        </Link>
      </main>

      <CountryDetail
        result={
          selected
            ? (byIso.get(selected) ??
              (selected === passport
                ? { dest: selected, base: "home", withDocs: "home", unlocked: false }
                : undefined))
            : undefined
        }
        warning={selected ? warningsByDest[selected] : undefined}
        apply={selected ? rules.apply[selected] : undefined}
        isHome={selected === passport}
        passport={passport}
        documents={docs}
        onClose={() => setSelected(undefined)}
      />
    </div>
  );
}
