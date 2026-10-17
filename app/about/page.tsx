import type { Metadata } from "next";
import { loadShared } from "@/lib/data/load.server";
import { BASE_MATRIX_CREDIT, DISCLAIMER } from "@/lib/legal";

const description =
  "Where Visa Unlock's entry rules come from, how confident we are, and the limits.";

export const metadata: Metadata = {
  title: "About the data · Visa Unlock",
  description,
  alternates: { canonical: "/about" },
  openGraph: { title: "About the data · Visa Unlock", description, type: "website" },
};

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default function AboutPage() {
  const { countries, rules } = loadShared();
  const countryCount = Object.keys(countries.countries).length;
  const ruleCount = rules.rules.length;
  const territoryCount = rules.territory_rules.length;
  const coverage = rules.coverage;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-display">About the data</h1>
      <p className="mt-4 text-caption text-muted-foreground">
        Last updated <time dateTime={rules.generated_from}>{fmt(rules.generated_from)}</time>
      </p>

      <article className="mt-10 flex flex-col gap-10 [&_h2]:text-title [&_p]:mt-3 [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
        <section>
          <h2>How it works</h2>
          <p>
            We start from what your passport gets on its own: visa free, eTA, visa on arrival,
            eVisa, visa required, or no admission. Then we check every rule where a visa or
            residence permit issued by another country changes that answer.
          </p>
          <p>
            A rule only counts when it gives you something better than you already have, so a visa
            on arrival rule never shows up for a country you can already enter visa free. A held
            permanent residence also satisfies a rule that asks for a residence permit, and a
            document issued by the destination itself never unlocks that destination.
          </p>
          <p>
            We cover <span className="tnum">{countryCount}</span> passports and destinations, with{" "}
            <span className="tnum">{ruleCount}</span> document rules plus{" "}
            <span className="tnum">{territoryCount}</span> for territories. Of those destinations,{" "}
            <span className="tnum">{coverage.rules_found.length}</span> have at least one rule and{" "}
            <span className="tnum">{coverage.checked_no_rule.length}</span> were checked and have
            none.
          </p>
        </section>

        <section>
          <h2>Sources</h2>
          <p>
            Every rule links to the page it came from, and you will see those links in each
            country&apos;s detail along with the date we last verified it. Rules were gathered
            destination by destination and cross-checked against official or recent sources for the
            high-impact ones.
          </p>
          <p>{BASE_MATRIX_CREDIT}</p>
        </section>

        <section>
          <h2>Confidence levels</h2>
          <p>Every rule carries one, and it is shown wherever the rule is.</p>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <strong className="text-foreground">High.</strong> Confirmed on an official government
              source recently.
            </li>
            <li>
              <strong className="text-foreground">Medium.</strong> An official source exists but the
              wording is unclear or was not verified recently.
            </li>
            <li>
              <strong className="text-foreground">Low.</strong> Based on secondary sources such as
              airline databases or travel reports. Double check before you travel.
            </li>
          </ul>
        </section>

        <section>
          <h2>Known limits</h2>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              This is a side project, not a commercial dataset. We aim for roughly 90 to 95 percent
              accuracy, and entry rules change often.
            </li>
            <li>
              <span className="tnum">{coverage.not_individually_checked.length}</span> destinations
              were not individually checked for document rules, so we may be missing some.
            </li>
            <li>
              Transit benefits, partial rules and area-wide rules are listed separately and never
              counted in your totals.
            </li>
            <li>
              We do not model stay limits across multiple trips, purpose of travel, passport
              validity, onward ticket checks, or anything decided at the border.
            </li>
            <li>
              Dual nationals should check each passport separately. We only ever consider one at a
              time.
            </li>
          </ul>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p className="text-foreground">{DISCLAIMER}</p>
        </section>
      </article>
    </main>
  );
}
