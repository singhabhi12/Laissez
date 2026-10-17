"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PassportPicker } from "@/components/PassportPicker";
import { useData } from "@/components/DataProvider";
import { presetDocuments } from "@/lib/documents";
import { presetKey, rankPresets, type PresetGain } from "@/lib/next-visa";
import type { UnlockData } from "@/lib/unlock";
import { parseDate, parseDocs } from "@/lib/query-state";
import { resultsHref, nextVisaHref } from "@/lib/routes";
import { fetchPassport, primePassport } from "@/lib/data/client";
import { useStoredPassport } from "@/lib/use-stored-passport";
import { events } from "@/lib/analytics";
import type { PassportFile, RulesFile } from "@/lib/data/types";

interface Props {
  initialPassport: string;
  initialDocs: string | undefined;
  initialDate: string | undefined;
  initialShard: PassportFile;
  rules: RulesFile;
}

const labelFor = (gain: PresetGain) =>
  presetDocuments.find((p) => presetKey(p.doc) === presetKey(gain))?.label ??
  `${gain.issuer} ${gain.type.replace(/_/g, " ")}`;

export function NextVisaView({ initialPassport, initialDocs, initialDate, initialShard, rules }: Props) {
  const router = useRouter();
  const { country, issuerLabel, groups } = useData();
  const [, remember] = useStoredPassport();
  const [passport, setPassport] = useState(initialPassport);
  const [shard, setShard] = useState(initialShard);
  const docs = useMemo(() => parseDocs(initialDocs), [initialDocs]);
  const travelDate = useMemo(() => parseDate(initialDate), [initialDate]);

  if (typeof window !== "undefined") primePassport(initialShard);

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

  const choose = useCallback(
    (iso3: string) => {
      setPassport(iso3);
      remember(iso3);
      window.history.pushState(null, "", nextVisaHref({ passport: iso3, docs, date: initialDate }));
      void fetchPassport(iso3).then(setShard);
    },
    [docs, initialDate, remember],
  );

  const ranked = useMemo(() => {
    if (shard.passport !== passport) return [];
    // With nothing held and no explicit travel date, the build already ranked
    // every preset for this passport. Otherwise rank what each preset adds on
    // top of the documents in hand, in the browser.
    if (docs.length === 0 && !initialDate) {
      return shard.next_visa.filter((g) => g.unlocked > 0);
    }
    return rankPresets(
      passport,
      docs,
      travelDate,
      data,
      presetDocuments,
      (iso3) => country(iso3)?.name ?? iso3,
    ).filter((g) => g.unlocked > 0);
  }, [shard, passport, docs, initialDate, travelDate, data, country]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-display">Next best visa</h1>
      <p className="mt-4 text-[21px] text-muted-foreground">The documents that would open the most new countries for you.</p>
      <div className="mt-8 max-w-sm">
        <PassportPicker value={passport} onChange={choose} />
      </div>
      <ol className="mt-10 flex flex-col gap-4">
        {ranked.map((r, i) => {
          const label = labelFor(r);
          return (
            <li key={presetKey(r)} className="flex flex-col gap-4 rounded-xl bg-grouped p-5 sm:flex-row sm:items-center">
              <span className="tnum text-title text-muted-foreground">{i + 1}</span>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-semibold"><span aria-hidden>{issuerLabel(r.issuer).flag} </span>{label}</span>
                  <span className="tnum font-medium text-link">
                    +{r.new_easy_access} {r.new_easy_access === 1 ? "country" : "countries"}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5" aria-label="Top destinations">
                  {r.top.map((dest) => {
                    const c = country(dest);
                    return (
                      <li key={dest} className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-caption">
                        <span aria-hidden>{c?.flagEmoji ?? "🏳️"}</span>{c?.name ?? dest}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-full"
                onClick={() => {
                  events.nextVisaTried({
                    passport,
                    issuer: r.issuer,
                    type: r.type,
                    gained: r.new_easy_access,
                  });
                  router.push(
                    resultsHref({
                      passport,
                      docs: [...docs, { issuer: r.issuer, type: r.type }],
                      date: initialDate,
                    }),
                  );
                }}
              >
                Try it
              </Button>
            </li>
          );
        })}
        {!ranked.length && <p className="text-muted-foreground">Your documents already unlock everything in our data.</p>}
      </ol>
    </main>
  );
}
