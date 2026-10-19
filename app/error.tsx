"use client";

import { useEffect } from "react";
import { errorDigest } from "@/lib/error-digest";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = errorDigest(error);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-caption uppercase tracking-wide text-muted-foreground">Something went wrong</p>
      <h1 className="mt-3 text-display">This page didn&apos;t load</h1>
      <p className="mt-4 text-[21px] leading-snug text-muted-foreground">
        That&apos;s on our side, not yours. Trying again usually fixes it.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <button
          type="button"
          // retry() re-fetches the segment before re-rendering it, so a
          // transient server failure can actually recover.
          onClick={() => retry()}
          className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-primary-foreground"
        >
          Try again
        </button>
        {/* A full document load is the reliable way out of a crashed client
            tree, so this stays an anchor rather than next/link. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-flex h-12 items-center rounded-full border border-border bg-card px-6 transition-colors hover:bg-secondary"
        >
          Go home
        </a>
      </div>

      {digest && (
        <p className="mt-10 text-caption text-muted-foreground">
          If it keeps happening, quote reference <span className="tnum font-medium">{digest}</span>{" "}
          when you report it.
        </p>
      )}
    </main>
  );
}
