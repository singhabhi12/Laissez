"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { events } from "@/lib/analytics";

/** Shares the current result URL: the native sheet where available, clipboard otherwise. */
export function ShareButton({ passport, documents }: { passport: string; documents: number }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My travel power · Laissez", url });
        events.shareClicked({ passport, documents, method: "share_sheet" });
        return;
      } catch {
        // Cancelled, or unavailable: fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      events.shareClicked({ passport, documents, method: "clipboard" });
    } catch {
      events.shareClicked({ passport, documents, method: "failed" });
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] transition-colors hover:bg-secondary"
    >
      {copied ? <Check className="size-4 text-status-free" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
