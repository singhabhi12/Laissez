import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Laissez — your real travel power",
    short_name: "Laissez",
    description:
      "Your passport plus the visas and residence permits you already hold: see every country they open.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Light-theme --background; the status bar and splash screen match the page.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["travel", "reference"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
