import { loadPassport, loadShared } from "@/lib/data/load.server";
import { presetBySlug } from "@/lib/documents";
import { parseWithSlug } from "@/lib/slugs";
import { computeTravelPower } from "@/lib/unlock";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Countries this passport and document open";

export default async function Image({
  params,
}: {
  params: Promise<{ passport: string; document: string }>;
}) {
  const { passport, document } = await params;
  const shared = loadShared();
  const country = Object.values(shared.countries.countries).find((c) => c.slug === passport);
  const slug = parseWithSlug(document);
  const preset = slug ? presetBySlug.get(slug) : undefined;
  const shard = country ? loadPassport(country.iso3) : undefined;

  if (!country || !preset || !shard) {
    return renderOgCard({ flag: "🌍", title: "Laissez", subtitle: "What your passport really opens", total: 0, of: 0, added: 0 });
  }

  const power = computeTravelPower(country.iso3, [preset.doc], new Date(`${shard.generated_from}T00:00:00.000Z`), {
    baseFor: () => shard.base,
    visaFreeDaysFor: () => shard.visa_free_days,
    groups: shared.rules.groups,
    rules: shared.rules.rules,
    territoryRules: shared.rules.territory_rules,
  });

  return renderOgCard({
    flag: country.flagEmoji,
    title: country.name,
    subtitle: `Countries ${country.demonymPlural} can visit with a ${preset.label}`,
    total: power.easyAccess.withDocs,
    of: power.destinations.length,
    added: power.newEasyAccess.length,
  });
}
