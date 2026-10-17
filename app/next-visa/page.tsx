import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextVisaView } from "@/components/NextVisaView";
import { DataProvider } from "@/components/DataProvider";
import { validateTravelSearch } from "@/lib/query-state";
import { loadPassport, loadShared } from "@/lib/data/load.server";
import { countryViews } from "@/lib/data/views";

const description =
  "Which visa or residence permit would open the most countries for your passport.";

export const metadata: Metadata = {
  title: "Next best visa · Visa Unlock",
  description,
  alternates: { canonical: "/next-visa" },
  openGraph: { title: "Next best visa · Visa Unlock", description, type: "website" },
};

export default async function NextVisaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { p, d, date } = validateTravelSearch(await searchParams);
  const shared = loadShared();
  const passport = p && shared.countries.countries[p] ? p : "IND";
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
      <NextVisaView
        key={`${passport}-${d ?? ""}-${date ?? ""}`}
        initialPassport={passport}
        initialDocs={d}
        initialDate={date}
        initialShard={shard}
        rules={shared.rules}
      />
    </DataProvider>
  );
}
