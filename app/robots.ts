import type { MetadataRoute } from "next";
import { INDEXABLE, SITE_URL } from "@/lib/landing";

export default function robots(): MetadataRoute.Robots {
  // Preview deployments carry real-looking pages at throwaway URLs; keep them
  // out of search results entirely.
  if (!INDEXABLE) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      { userAgent: ["Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit"], allow: "/" },
      // /og is a rendering endpoint, not a page worth crawling.
      { userAgent: "*", allow: "/", disallow: ["/og", "/api/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
