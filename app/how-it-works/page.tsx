import type { Metadata } from "next";
import Link from "next/link";

const description = "Three steps to see what your passport and documents really open.";

export const metadata: Metadata = {
  title: "How it works · Laissez",
  description,
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: "How it works · Laissez", description, type: "website" },
};

const steps = [
  { t: "Pick your passport", d: "We load what it opens on its own: visa free, eTA, visa on arrival, eVisa or visa required." },
  { t: "Add your documents", d: "Visas, residence permits and green cards you already hold. Many countries accept them in place of their own visa." },
  { t: "See your real reach", d: "Unlocked countries light up in blue. Tap any country for the conditions, sources and how sure we are." },
];

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-display">How it works</h1>
      <ol className="mt-12 flex flex-col gap-4">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-5 rounded-xl bg-grouped p-6">
            <span className="tnum text-title text-link">{i + 1}</span>
            <div>
              <h2 className="font-semibold">{s.t}</h2>
              <p className="mt-1 text-muted-foreground">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/" className="mt-10 inline-flex h-12 items-center rounded-full bg-primary px-6 text-primary-foreground">Check my travel power</Link>
    </main>
  );
}
