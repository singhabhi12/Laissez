import type { NextRequest } from "next/server";
import { loadPassport, loadShared } from "@/lib/data/load.server";
import { parseDate, parseDocs } from "@/lib/query-state";
import { computeTravelPower } from "@/lib/unlock";
import { renderOgCard } from "@/lib/og";
import { docSummary } from "@/lib/og-summary";

/**
 * Open Graph card for /results, which is driven by query parameters that an
 * `opengraph-image` convention cannot see.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shared = loadShared();
  const requested = params.get("p") ?? "";
  const country = shared.countries.countries[requested];
  const shard = country ? loadPassport(country.iso3) : undefined;

  if (!country || !shard) {
    return renderOgCard({
      flag: "🌍",
      title: "Laissez",
      subtitle: "What your passport really opens",
      total: 0,
      of: 0,
      added: 0,
    });
  }

  const docs = parseDocs(params.get("d") ?? undefined);
  const power = computeTravelPower(country.iso3, docs, parseDate(params.get("date") ?? undefined), {
    baseFor: () => shard.base,
    visaFreeDaysFor: () => shard.visa_free_days,
    groups: shared.rules.groups,
    rules: shared.rules.rules,
    territoryRules: shared.rules.territory_rules,
  });

  return renderOgCard({
    flag: country.flagEmoji,
    title: country.name,
    subtitle: docSummary(docs),
    total: power.easyAccess.withDocs,
    of: power.destinations.length,
    added: power.newEasyAccess.length,
  });
}
