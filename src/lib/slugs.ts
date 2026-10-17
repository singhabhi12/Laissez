/**
 * Slug helpers shared by the landing pages, the sitemap and the build script.
 * Slugs are generated at build time into countries.json, so nothing here
 * depends on the dataset being loaded.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * English demonyms do not all take a plural -s: "Indians" and "Germans" work,
 * but "Britishs" and "Chineses" do not. Collective adjectives get
 * "<demonym> passport holders" instead, which is correct for every country.
 */
export function demonymPlural(demonym: string): string {
  return /(?:ese|ish|ch|sh|ss|s|x|z)$/i.test(demonym)
    ? `${demonym} passport holders`
    : `${demonym}s`;
}

/** The second path segment of a landing page: /india/with-us-visa */
export const withSlug = (documentSlug: string) => `with-${documentSlug}`;

/** Returns the document slug, or undefined when the segment is not a with-* one. */
export function parseWithSlug(segment: string): string | undefined {
  return segment.startsWith("with-") ? segment.slice("with-".length) : undefined;
}
