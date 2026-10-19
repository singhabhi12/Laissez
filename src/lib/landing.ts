import type { EnrichedCountry } from "./data/enrich";
import type { PresetDocument } from "./documents";
import type { TravelPower } from "./unlock";
import { withArticle, withArticleCapitalised } from "./article";

/**
 * The absolute origin for canonicals, Open Graph URLs and the sitemap.
 *
 * 1. NEXT_PUBLIC_SITE_URL, if set. Set it for Production only (see DEPLOY.md).
 * 2. On Vercel production: the project's production domain.
 * 3. On Vercel previews: that preview's own URL, so its share cards and links
 *    point at the preview rather than at production.
 * 4. Locally: a placeholder.
 *
 * Server-only. VERCEL_* variables are not exposed to the browser, and nothing
 * client-side imports this.
 */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env["NEXT_PUBLIC_SITE_URL"];
  if (explicit) return explicit.replace(/\/$/, "");
  if (env["VERCEL_ENV"] === "production" && env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (env["VERCEL_URL"]) return `https://${env["VERCEL_URL"]}`;
  return "https://laissez.example";
}

export const SITE_URL = resolveSiteUrl();

/** Only production should be indexed; previews and local builds should not. */
export const INDEXABLE = !process.env["VERCEL_ENV"] || process.env["VERCEL_ENV"] === "production";
/** The year shown in landing page titles. */
export const DATA_YEAR = 2026;

export interface LandingCopy {
  title: string;
  description: string;
  heading: string;
  intro: [string, string];
  canonical: string;
}

const list = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
};

/**
 * All landing page copy is derived from the computed result, so a page can never
 * claim a number the engine does not produce.
 */
export function landingCopy(
  country: EnrichedCountry,
  preset: PresetDocument,
  power: TravelPower,
  nameOf: (iso3: string) => string,
): LandingCopy {
  const easy = power.easyAccess.withDocs;
  const added = power.newEasyAccess.length;
  const unlocked = power.unlocked;
  const who = country.demonymPlural;
  const doc = preset.label;

  const highlights = [...power.newEasyAccess]
    .sort((a, b) => (b.rule?.max_stay_days ?? 0) - (a.rule?.max_stay_days ?? 0))
    .slice(0, 3)
    .map((d) => nameOf(d.dest));

  const title = `Countries ${who} can visit with a ${doc} (${DATA_YEAR})`;

  const description =
    added > 0
      ? `${withArticleCapitalised(doc)} adds ${added} easy-access ${
          added === 1 ? "country" : "countries"
        } to ${country.name}'s passport, for ${easy} in total. See every one, with the conditions and official sources.`
      : `See what ${country.name}'s passport opens on its own: ${easy} easy-access ${
          easy === 1 ? "country" : "countries"
        }. ${withArticleCapitalised(doc)} does not change the entry rules in our data.`;

  const first =
    added > 0
      ? `Holding ${withArticle(doc)} turns ${added} more ${
          added === 1 ? "country" : "countries"
        } into visa free, eTA or visa on arrival for ${withArticle(
          country.demonym,
        )} passport, taking the total to ${easy} of ${power.destinations.length} destinations we cover.`
      : `${withArticleCapitalised(country.demonym)} passport already reaches ${easy} of ${
          power.destinations.length
        } destinations we cover without a visa, an eTA or a visa on arrival, and ${withArticle(
          doc,
        )} does not change any of them in our data.`;

  const second =
    highlights.length > 0
      ? `${list(highlights)} ${highlights.length === 1 ? "is" : "are"} among them, and ${
          unlocked === added
            ? "every rule below links to its official source"
            : `${unlocked} ${unlocked === 1 ? "destination" : "destinations"} improve in all`
        }.`
      : `Rules change often, so every entry below links to the official source it came from.`;

  return {
    title,
    description,
    heading: `Countries ${who} can visit with a ${doc}`,
    intro: [first, second],
    canonical: `${SITE_URL}/${country.slug}/with-${preset.slug}`,
  };
}
