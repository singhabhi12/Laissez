import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found · Laissez",
  robots: { index: false },
};

const elsewhere = [
  { href: "/next-visa", label: "Next best visa", hint: "Which document would open the most for you" },
  { href: "/how-it-works", label: "How it works", hint: "Three steps, start to finish" },
  { href: "/about", label: "About the data", hint: "Sources, confidence and known limits" },
] as const;

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-caption uppercase tracking-wide text-muted-foreground">404</p>
      <h1 className="mt-3 text-display">This page isn&apos;t on the map</h1>
      <p className="mt-4 text-[21px] leading-snug text-muted-foreground">
        The link may be old, or the address mistyped. Everything else is where you left it.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-12 items-center rounded-full bg-primary px-6 text-primary-foreground"
        >
          Check my travel power
        </Link>
      </div>

      <nav aria-label="Other pages" className="mt-16">
        <h2 className="mb-2 px-4 text-caption uppercase tracking-wide text-muted-foreground">
          Or try
        </h2>
        <ul className="overflow-hidden rounded-xl bg-grouped">
          {elsewhere.map((item, i) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-secondary ${i ? "border-t border-border" : ""}`}
              >
                <span className="flex flex-1 flex-col">
                  <span>{item.label}</span>
                  <span className="text-caption text-muted-foreground">{item.hint}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
