import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomePlanner } from "@/components/HomePlanner";
import { DataProvider } from "@/components/DataProvider";
import { examples } from "@/lib/documents";
import { computeTravelPower } from "@/lib/unlock";
import { resultsHref } from "@/lib/routes";
import { loadPassport, loadShared } from "@/lib/data/load.server";
import { countryViews } from "@/lib/data/views";

const description =
  "See which countries your passport plus your visas and residence permits open.";

export const metadata: Metadata = {
  title: "Visa Unlock · What's your real travel power?",
  description,
  openGraph: { title: "Visa Unlock · What's your real travel power?", description, type: "website" },
};

export default function HomePage() {
  const shared = loadShared();
  const now = new Date();

  // Computed on the server so the cards ship as plain HTML.
  const cards = examples.map((e) => {
    const shard = loadPassport(e.passport);
    const country = shared.countries.countries[e.passport];
    const unlocked = shard
      ? computeTravelPower(e.passport, e.docs, now, {
          baseFor: () => shard.base,
          visaFreeDaysFor: () => shard.visa_free_days,
          groups: shared.rules.groups,
          rules: shared.rules.rules,
          territoryRules: shared.rules.territory_rules,
        }).newEasyAccess.length
      : 0;
    return { ...e, flagEmoji: country?.flagEmoji ?? "🏳️", unlocked };
  });

  return (
    <DataProvider
      data={{
        countries: countryViews(shared.countries.countries),
        groups: shared.rules.groups,
        documentTypes: shared.rules.document_types,
        lastVerified: shared.rules.generated_from,
      }}
    >
      <main className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <section className="mx-auto max-w-3xl pb-12 pt-16 text-center sm:pt-24">
          <h1 className="text-display">What&apos;s your real travel power?</h1>
          <p className="mx-auto mt-4 max-w-xl text-[21px] leading-snug text-muted-foreground">
            Your passport is only half the story. See what your visas and residence permits unlock.
          </p>
        </section>

        <HomePlanner />

        <section className="mx-auto mt-20 max-w-5xl">
          <h2 className="mb-6 text-title">Try an example</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((e) => (
              <Link
                key={e.label}
                href={resultsHref({ passport: e.passport, docs: e.docs })}
                className="group flex flex-col gap-6 rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-float"
              >
                <span aria-hidden className="text-4xl">{e.flagEmoji}</span>
                <span className="font-semibold">{e.label}</span>
                <span className="flex items-center justify-between text-caption text-muted-foreground">
                  <span className="tnum text-link">+{e.unlocked} unlocked</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </DataProvider>
  );
}
