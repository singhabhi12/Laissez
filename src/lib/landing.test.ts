import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { indefiniteArticle, withArticle } from "./article";
import { slugify, demonymPlural, parseWithSlug, withSlug } from "./slugs";
import { presetDocuments, presetBySlug } from "./documents";
import { resolveSiteUrl } from "./landing";
import type { CountriesFile } from "./data/types";

const countries = (
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, "../../public/data/countries.json"), "utf8"),
  ) as CountriesFile
).countries;

describe("indefinite article", () => {
  it.each([
    ["Indian", "an"],
    ["American", "an"],
    ["German", "a"],
    ["Ukrainian", "a"],
    ["Ugandan", "a"],
    ["Uruguayan", "a"],
    ["Uzbekistani", "an"],
    ["I-Kiribati", "an"],
  ])("%s takes '%s'", (word, expected) => {
    expect(indefiniteArticle(word)).toBe(expected);
  });

  it("reads initialisms by sound, not spelling", () => {
    expect(withArticle("US visa")).toBe("a US visa");
    expect(withArticle("UK visa")).toBe("a UK visa");
    expect(withArticle("UAE residence permit")).toBe("a UAE residence permit");
    expect(withArticle("EU residence permit")).toBe("an EU residence permit");
  });

  it("never produces an empty or doubled article", () => {
    for (const c of Object.values(countries)) {
      expect(["a", "an"]).toContain(indefiniteArticle(c.demonym));
    }
    for (const p of presetDocuments) {
      expect(["a", "an"]).toContain(indefiniteArticle(p.label));
    }
  });
});

describe("demonym plurals", () => {
  it("avoids impossible plurals for collective adjectives", () => {
    expect(demonymPlural("Indian")).toBe("Indians");
    expect(demonymPlural("British")).toBe("British passport holders");
    expect(demonymPlural("Chinese")).toBe("Chinese passport holders");
    expect(demonymPlural("Swiss")).toBe("Swiss passport holders");
    expect(demonymPlural("Filipino")).toBe("Filipinos");
  });

  it("is generated for every country", () => {
    for (const c of Object.values(countries)) {
      expect(c.demonym, c.iso3).toBeTruthy();
      expect(c.demonymPlural, c.iso3).toBeTruthy();
      expect(c.demonymPlural).not.toMatch(/ss$|shs$|chs$|eses$/);
    }
  });
});

describe("slugs", () => {
  it("are unique across all 199 countries", () => {
    const slugs = Object.values(countries).map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toHaveLength(199);
  });

  it("are url safe", () => {
    for (const c of Object.values(countries)) expect(c.slug).toMatch(/^[a-z0-9-]+$/);
    for (const p of presetDocuments) expect(p.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("match the documented examples", () => {
    expect(countries["IND"]?.slug).toBe("india");
    expect(presetBySlug.get("us-visa")?.label).toBe("US visa");
    expect(`/${countries["IND"]?.slug}/${withSlug("us-visa")}`).toBe("/india/with-us-visa");
  });

  it("round trips the with- prefix", () => {
    expect(parseWithSlug("with-us-visa")).toBe("us-visa");
    expect(parseWithSlug("us-visa")).toBeUndefined();
    // "without" has no hyphen, so it is not a with- segment.
    expect(parseWithSlug("without")).toBeUndefined();
    expect(parseWithSlug("with-")).toBe("");
  });

  it("strips diacritics and punctuation", () => {
    expect(slugify("Côte d'Ivoire")).toBe("cote-d-ivoire");
    expect(slugify("Saint Vincent and the Grenadines")).toBe("saint-vincent-and-the-grenadines");
  });
});

describe("site URL resolution on Vercel", () => {
  it("prefers an explicit NEXT_PUBLIC_SITE_URL, without a trailing slash", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://laissez.app/", VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app" }),
    ).toBe("https://laissez.app");
  });

  it("uses the production domain in production when nothing is set", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "laissez.app",
        VERCEL_URL: "laissez-abc123.vercel.app",
      }),
    ).toBe("https://laissez.app");
  });

  it("points a preview at itself, so its share cards show its own data", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "laissez.app",
        VERCEL_URL: "laissez-git-feature-abc.vercel.app",
      }),
    ).toBe("https://laissez-git-feature-abc.vercel.app");
  });

  it("falls back to a placeholder off Vercel", () => {
    expect(resolveSiteUrl({})).toBe("https://laissez.example");
  });
});
