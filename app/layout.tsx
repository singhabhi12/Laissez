import type { Metadata } from "next";
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
  title: "Visa Unlock",
  description,
  icons: { icon: [{ url: "/favicon.ico", type: "image/x-icon" }] },
  alternates: { canonical: "/" },
  openGraph: { title: "Visa Unlock", description, type: "website", url: SITE_URL },
  twitter: { card: "summary_large_image" },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
