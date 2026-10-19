import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultsView } from "@/components/results/ResultsView";
import { DataProvider } from "@/components/DataProvider";
import { parseDocs, validateTravelSearch } from "@/lib/query-state";
import { travelQuery } from "@/lib/routes";
import { loadPassport, loadShared } from "@/lib/data/load.server";
import { countryViews } from "@/lib/data/views";

const description = "Every country your passport and documents open, on one map.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { p, d, date } = validateTravelSearch(await searchParams);
  const query = travelQuery({ passport: p, docs: parseDocs(d), date });
  const title = "Your travel power · Laissez";
  return {
    title,
    description,
    alternates: { canonical: `/results${query}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/results${query}`,
      images: [{ url: `/og${query}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [`/og${query}`] },
  };
}

const DEFAULT_PASSPORT = "IND";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { p, d, date } = validateTravelSearch(await searchParams);
  const shared = loadShared();

  const passport = p && shared.countries.countries[p] ? p : DEFAULT_PASSPORT;
  const shard = loadPassport(passport);
  if (!shard) notFound();

  return (
    <DataProvider
      data={{
        countries: countryViews(shared.countries.countries),
        groups: shared.rules.groups,
        documentTypes: shared.rules.document_types,
        lastVerified: shared.rules.generated_from,
      }}
    >
      <ResultsView
        key={`${passport}-${d ?? ""}-${date ?? ""}`}
        initialPassport={passport}
        initialDocs={d}
        initialDate={date}
        initialShard={shard}
        rules={shared.rules}
        isoNumeric={shared.isoNumeric}
      />
    </DataProvider>
  );
}
