import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { loadPassport, loadShared } from "@/lib/data/load.server";
import { presetBySlug, presetDocuments } from "@/lib/documents";
import { parseWithSlug } from "@/lib/slugs";
import { landingCopy, SITE_URL } from "@/lib/landing";
import { withArticle, withArticleCapitalised } from "@/lib/article";
import { computeTravelPower, isEasyAccess, type TravelPower } from "@/lib/unlock";
import type { EnrichedCountry } from "@/lib/data/enrich";
import type { PresetDocument } from "@/lib/documents";
import { statusLabel } from "@/lib/status";
import { StatusPill } from "@/components/StatusPill";
import { landingHref, resultsHref } from "@/lib/routes";

/**
 * All 2189 pages prerender in ~12 s, so the whole set is built up front.
 * `revalidate` still caps how long a page may be served after the data changes,
 * and `dynamicParams` means a trimmed prerender list (LANDING_PRERENDER_COUNT)
 * degrades to on-demand rendering rather than a 404.
 */
export const revalidate = 86400;
export const dynamicParams = true;

interface Resolved {
  country: EnrichedCountry;
  preset: PresetDocument;
  power: TravelPower;
  nameOf: (iso3: string) => string;
}

function resolve(passportSlug: string, documentSegment: string): Resolved | undefined {
  const documentSlug = parseWithSlug(documentSegment);
  if (!documentSlug) return undefined;
  const preset = presetBySlug.get(documentSlug);
  if (!preset) return undefined;

  const shared = loadShared();
  const iso3 = Object.values(shared.countries.countries).find((c) => c.slug === passportSlug)?.iso3;
  if (!iso3) return undefined;
  const shard = loadPassport(iso3);
  const country = shared.countries.countries[iso3];
  if (!shard || !country) return undefined;

  const power = computeTravelPower(iso3, [preset.doc], new Date(`${shard.generated_from}T00:00:00.000Z`), {
    baseFor: () => shard.base,
    visaFreeDaysFor: () => shard.visa_free_days,
    groups: shared.rules.groups,
    rules: shared.rules.rules,
    territoryRules: shared.rules.territory_rules,
  });

  return {
    country,
    preset,
    power,
    nameOf: (dest) => shared.countries.countries[dest]?.name ?? dest,
  };
}

export function generateStaticParams(): { passport: string; document: string }[] {
  const { countries } = loadShared();
  const all = Object.values(countries.countries);

  // Every passport by default. Set LANDING_PRERENDER_COUNT to trim the build to
  // the highest-traffic passports and let the rest render on demand.
  const limit = Number(process.env["LANDING_PRERENDER_COUNT"] ?? String(all.length));
  const priority = (process.env["LANDING_PRERENDER_ISO3"] ??
    "IND,CHN,NGA,PHL,PAK,BGD,IDN,VNM,EGY,TUR,RUS,BRA,MEX,ZAF,KEN,GHA,ETH,UKR,IRN,IRQ,LKA,NPL,UZB,MAR,DZA,THA,MMR,COL,PER,JOR")
    .split(",")
    .map((s) => s.trim());

  const chosen =
    limit >= all.length
      ? all
      : priority
          .map((iso3) => all.find((c) => c.iso3 === iso3))
          .filter((c): c is EnrichedCountry => !!c)
          .slice(0, limit);

  return chosen.flatMap((c) =>
    presetDocuments.map((p) => ({ passport: c.slug, document: `with-${p.slug}` })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ passport: string; document: string }>;
}): Promise<Metadata> {
  const { passport, document } = await params;
  const resolved = resolve(passport, document);
  if (!resolved) return {};
  const copy = landingCopy(resolved.country, resolved.preset, resolved.power, resolved.nameOf);
  return {
    title: copy.title,
    description: copy.description,
    alternates: { canonical: copy.canonical },
    openGraph: {
      title: copy.title,
      description: copy.description,
      type: "article",
      url: copy.canonical,
    },
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ passport: string; document: string }>;
}) {
  const { passport, document } = await params;
  const resolved = resolve(passport, document);
  if (!resolved) notFound();
  const { country, preset, power, nameOf } = resolved;
  const copy = landingCopy(country, preset, power, nameOf);

  const allCountries = loadShared().countries.countries;

  const unlocked = [...power.destinations]
    .filter((d) => d.unlocked)
    .sort(
      (a, b) =>
        Number(isEasyAccess(b.withDocs)) - Number(isEasyAccess(a.withDocs)) ||
        (b.rule?.max_stay_days ?? 0) - (a.rule?.max_stay_days ?? 0) ||
        nameOf(a.dest).localeCompare(nameOf(b.dest)),
    );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": copy.canonical,
        url: copy.canonical,
        name: copy.title,
        description: copy.description,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: "Laissez", url: SITE_URL },
      },
      {
        "@type": "ItemList",
        name: copy.heading,
        numberOfItems: unlocked.length,
        itemListElement: unlocked.map((d, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: nameOf(d.dest),
          description: `${statusLabel[d.withDocs]}${d.rule?.max_stay_days ? ` for up to ${d.rule.max_stay_days} days` : ""}`,
        })),
      },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-caption uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{country.flagEmoji} </span>
        {country.name}
      </p>
      <h1 className="mt-3 text-display">{copy.heading}</h1>
      <div className="mt-6 flex flex-col gap-3 text-[21px] leading-snug text-muted-foreground">
        <p>{copy.intro[0]}</p>
        <p>{copy.intro[1]}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={resultsHref({ passport: country.iso3, docs: [preset.doc] })}
          className="inline-flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-primary-foreground"
        >
          Customise
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        <span className="tnum text-caption text-muted-foreground">
          {power.easyAccess.withDocs} easy access of {power.destinations.length}
        </span>
      </div>

      {unlocked.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-title">
            Unlocked by {withArticle(preset.label)} <span className="tnum text-muted-foreground">· {unlocked.length}</span>
          </h2>
          <ul className="mt-6 flex flex-col gap-3">
            {unlocked.map((d) => {
              const rule = d.rule!;
              return (
                <li key={d.dest} className="flex flex-col gap-2 rounded-xl bg-grouped p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span aria-hidden className="text-2xl">
                      {allCountries[d.dest]?.flagEmoji ?? "🏳️"}
                    </span>
                    <span className="font-semibold">{nameOf(d.dest)}</span>
                    <StatusPill status={d.withDocs} />
                    {rule.max_stay_days ? (
                      <span className="tnum text-caption text-muted-foreground">up to {rule.max_stay_days} days</span>
                    ) : null}
                  </div>
                  <p className="text-[15px] text-muted-foreground">{rule.doc_conditions}</p>
                  <p className="flex flex-wrap items-center gap-3 text-caption text-muted-foreground">
                    <span className="capitalize">Confidence: {rule.confidence}</span>
                    {rule.sources.map((s) => (
                      <a key={s} href={s} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
                        {new URL(s).hostname.replace(/^www\./, "")}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ))}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="mt-16 rounded-xl bg-grouped p-5 text-[15px] text-muted-foreground">
          {withArticleCapitalised(preset.label)} does not change the entry rules for{" "}
          {withArticle(country.demonym)} passport in our data. Try the planner to see which document
          would help most.
        </p>
      )}

      <nav className="mt-16 flex flex-col gap-3" aria-label="Other documents">
        <h2 className="text-title">With another document</h2>
        <ul className="flex flex-wrap gap-2">
          {presetDocuments
            .filter((p) => p.slug !== preset.slug)
            .map((p) => (
              <li key={p.slug}>
                <Link
                  href={landingHref(country.slug, p.slug)}
                  className="inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-[15px] hover:bg-secondary"
                >
                  {p.label}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </main>
  );
}
