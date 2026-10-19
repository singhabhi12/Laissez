"use client";

import { ArrowRight, ArrowDown, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useData } from "@/components/DataProvider";
import { StatusPill } from "@/components/StatusPill";
import { useDocLabel } from "@/components/DocumentPicker";
import { confidenceText } from "@/lib/status";
import { DISCLAIMER } from "@/lib/legal";
import { events } from "@/lib/analytics";
import { applyInfoFor } from "@/lib/apply";
import type { ApplyInfo, Warning } from "@/lib/data/schema";
import type { DestinationResult, HeldDocument } from "@/lib/unlock";
import { ReportProblem } from "@/components/results/ReportProblem";

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Body({
  r,
  warning,
  apply,
  isHome,
  passport,
  documents,
}: {
  r: DestinationResult;
  warning?: Warning | undefined;
  apply?: ApplyInfo | undefined;
  isHome: boolean;
  passport: string;
  documents: readonly HeldDocument[];
}) {
  const rule = r.rule;
  const { lastVerified, country } = useData();
  const docLabel = useDocLabel();
  const howToApply = applyInfoFor(r.withDocs, apply);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
      {isHome ? (
        <p className="rounded-xl bg-grouped p-4 text-[15px] text-muted-foreground">
          This is your passport country, so no entry rules apply.
        </p>
      ) : (
        <div className="rounded-xl bg-grouped p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">Your passport alone</span>
              <StatusPill status={r.base} />
            </div>
            {rule && (
              <>
                <ArrowRight className="hidden size-5 text-muted-foreground sm:block" aria-label="becomes" />
                <ArrowDown className="size-5 text-muted-foreground sm:hidden" aria-label="becomes" />
                <div className="flex flex-col gap-1">
                  <span className="text-caption text-muted-foreground">
                    With your {r.matchedDoc ? docLabel(r.matchedDoc) : "document"}
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusPill status={r.withDocs} />
                    {rule.max_stay_days ? <span className="tnum text-caption">up to {rule.max_stay_days} days</span> : null}
                  </span>
                </div>
              </>
            )}
          </div>
          {r.baseVisaFreeDays !== undefined && !rule && (
            <p className="tnum mt-3 text-caption text-muted-foreground">Up to {r.baseVisaFreeDays} days.</p>
          )}
        </div>
      )}

      {warning && (
        <section className="flex items-start gap-3 rounded-xl bg-grouped p-4">
          <TriangleAlert className="mt-0.5 size-5 text-destructive" aria-hidden />
          <div>
            <h3 className="font-semibold">Warning</h3>
            <p className="text-[15px] text-muted-foreground">{warning.text}</p>
            <a href={warning.source} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-2 text-link hover:underline">
              {new URL(warning.source).hostname.replace(/^www\./, "")}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </section>
      )}

      {rule ? (
        <>
          <section className="rounded-xl bg-grouped p-4">
            <h3 className="mb-1 font-semibold">Conditions</h3>
            <p className="text-[15px] text-muted-foreground">{rule.doc_conditions}</p>
            {rule.notes ? <p className="mt-2 text-caption text-muted-foreground">{rule.notes}</p> : null}
          </section>
          <section className="flex items-start gap-3 rounded-xl bg-grouped p-4">
            <ShieldCheck className="mt-0.5 size-5 text-link" aria-hidden />
            <div>
              <h3 className="font-semibold">Confidence: <span className="capitalize">{rule.confidence}</span></h3>
              <p className="text-[15px] text-muted-foreground">{confidenceText[rule.confidence]}</p>
            </div>
          </section>
          {(rule.valid_from || rule.valid_until) && (
            <section className="rounded-xl bg-grouped p-4 text-[15px]">
              {rule.valid_from && <p>Valid from <span className="tnum">{fmt(rule.valid_from)}</span></p>}
              {rule.valid_until && <p>Valid until <span className="tnum">{fmt(rule.valid_until)}</span></p>}
            </section>
          )}
          <section className="rounded-xl bg-grouped p-4">
            <h3 className="mb-2 font-semibold">Sources</h3>
            <ul className="flex flex-col">
              {rule.sources.map((s) => (
                <li key={s}>
                  <a
                    href={s}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() =>
                      events.sourceClicked({
                        destination: r.dest,
                        ruleId: rule.id,
                        host: new URL(s).hostname.replace(/^www\./, ""),
                      })
                    }
                    className="flex min-h-11 items-center gap-2 text-link hover:underline"
                  >
                    {new URL(s).hostname.replace(/^www\./, "")}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-caption text-muted-foreground">Last verified {fmt(rule.last_verified)}</p>
          </section>
        </>
      ) : (
        !isHome && (
          <p className="rounded-xl bg-grouped p-4 text-[15px] text-muted-foreground">
            None of your documents change the entry rules here.
          </p>
        )
      )}

      {howToApply && (
        <section className="rounded-xl bg-grouped p-4">
          <h3 className="mb-1 font-semibold">How to apply</h3>
          <p className="text-[15px] text-muted-foreground">{howToApply.how_to_apply}</p>
          {howToApply.official_url && (
            <a href={howToApply.official_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-2 text-link hover:underline">
              {new URL(howToApply.official_url).hostname.replace(/^www\./, "")}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
          {howToApply.confirmed_on && (
            <p className="text-caption text-muted-foreground">Link checked {fmt(howToApply.confirmed_on)}</p>
          )}
        </section>
      )}

      <footer className="flex flex-col gap-3 pt-2 text-caption text-muted-foreground">
        {!isHome && (
          <ReportProblem
            ruleId={rule?.id}
            passport={passport}
            destination={r.dest}
            destinationName={country(r.dest)?.name ?? r.dest}
            documents={documents}
          />
        )}
        <p>{DISCLAIMER}</p>
        {!rule && <p>Last verified {fmt(lastVerified)}</p>}
      </footer>
    </div>
  );
}

export function CountryDetail({
  result,
  warning,
  apply,
  isHome = false,
  passport,
  documents,
  onClose,
}: {
  result?: DestinationResult | undefined;
  warning?: Warning | undefined;
  apply?: ApplyInfo | undefined;
  isHome?: boolean;
  passport: string;
  documents: readonly HeldDocument[];
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const { country } = useData();
  const c = result ? country(result.dest) : undefined;
  const open = !!result;
  const title = c && (
    <span className="flex items-center gap-3"><span aria-hidden className="text-3xl">{c.flagEmoji}</span>{c.name}</span>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="glass max-h-[90vh] rounded-t-[20px]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-title">{title}</DrawerTitle>
            <DrawerDescription className="sr-only">Entry details</DrawerDescription>
          </DrawerHeader>
          {result && (
            <Body r={result} warning={warning} apply={apply} isHome={isHome} passport={passport} documents={documents} />
          )}
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="glass flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-title">{title}</SheetTitle>
          <SheetDescription className="sr-only">Entry details</SheetDescription>
        </SheetHeader>
        {result && (
          <Body r={result} warning={warning} apply={apply} isHome={isHome} passport={passport} documents={documents} />
        )}
      </SheetContent>
    </Sheet>
  );
}
