import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import "../src/styles.css";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/landing";

// Inter is the fallback only: --font-sans keeps the system stack ahead of it.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const description =
  "Your passport plus your visas and residence permits: see your real travel power.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Laissez",
  description,
  alternates: { canonical: "/" },
  openGraph: { title: "Laissez", description, type: "website", url: SITE_URL },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          {/* /_vercel/insights only exists on Vercel; elsewhere it would 404 on
              every page and the nosniff header would (rightly) refuse it. */}
          {process.env["VERCEL"] && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  );
}
