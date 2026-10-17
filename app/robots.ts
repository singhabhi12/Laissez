import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/landing";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: ["Googlebot", "Bingbot", "Twitterbot", "facebookexternalhit"], allow: "/" },
      // /og is a rendering endpoint, not a page worth crawling.
      { userAgent: "*", allow: "/", disallow: ["/og"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
