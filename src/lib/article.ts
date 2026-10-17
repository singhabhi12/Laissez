/**
 * "a" or "an" by how the phrase is *said*, not just its first letter.
 *
 * Initialisms go by the letter's sound: "an EU residence permit" (ee-you) but
 * "a US visa" and "a UK visa" (yoo). Most U-words also sound "yoo", so they take
 * "a" — "a Ukrainian", "a Ugandan" — with the few "oo" ones listed explicitly.
 */
const LETTERS_SOUNDING_VOWEL = new Set(["A", "E", "F", "H", "I", "L", "M", "N", "O", "R", "S", "X"]);
const U_WORDS_TAKING_AN = new Set(["Uzbekistani", "Uzbek"]);

export function indefiniteArticle(phrase: string): "a" | "an" {
  const first = phrase.trim().split(/\s+/)[0] ?? "";
  if (!first) return "a";
  if (/^[A-Z]{2,}$/.test(first)) return LETTERS_SOUNDING_VOWEL.has(first[0]!) ? "an" : "a";
  if (U_WORDS_TAKING_AN.has(first)) return "an";
  if (/^[Uu]/.test(first)) return "a";
  return /^[AEIOUaeiou]/.test(first) ? "an" : "a";
}

/** "a US visa" */
export const withArticle = (phrase: string) => `${indefiniteArticle(phrase)} ${phrase}`;

/** "A US visa", for the start of a sentence. */
export const withArticleCapitalised = (phrase: string) => {
  const article = indefiniteArticle(phrase);
  return `${article[0]!.toUpperCase()}${article.slice(1)} ${phrase}`;
};
