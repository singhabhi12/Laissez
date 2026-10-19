"use client";

import { useEffect } from "react";
import "../src/styles.css";
import { errorDigest } from "@/lib/error-digest";

/**
 * Shown when the root layout itself fails, so it replaces the whole document:
 * no header, footer, fonts or ThemeProvider. It applies the visitor's theme
 * itself, the same way next-themes does, so dark-mode users are not flashed
 * with a white page.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = errorDigest(error);

  useEffect(() => {
    console.error(error);
    try {
      const stored = localStorage.getItem("theme");
      const dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", dark);
    } catch {
      // Storage blocked: the light theme is a fine fallback.
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <title>Something went wrong · Laissez</title>
        <main className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
          <p className="text-caption uppercase tracking-wide text-muted-foreground">Something went wrong</p>
          <h1 className="mt-3 text-display">Laissez didn&apos;t load</h1>
          <p className="mt-4 text-[21px] leading-snug text-muted-foreground">
            That&apos;s on our side, not yours. Trying again usually fixes it.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-primary-foreground"
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 hover:bg-secondary"
            >
              Go home
            </a>
          </div>
          {digest && (
            <p className="mt-10 text-caption text-muted-foreground">
              Reference <span className="tnum font-medium">{digest}</span>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
