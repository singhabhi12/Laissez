import type { MetadataRoute } from "next";
import { loadShared } from "@/lib/data/load.server";
import { presetDocuments } from "@/lib/documents";
import { SITE_URL } from "@/lib/landing";

export default function sitemap(): MetadataRoute.Sitemap {
  const { countries, rules } = loadShared();
  const lastModified = new Date(`${rules.generated_from}T00:00:00.000Z`);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/how-it-works`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/next-visa`, lastModified, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Every passport x preset landing page: 199 x 11.
  const landing: MetadataRoute.Sitemap = Object.values(countries.countries).flatMap((c) =>
    presetDocuments.map((p) => ({
      url: `${SITE_URL}/${c.slug}/with-${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  );

  return [...staticPages, ...landing];
}
