import type { DocType } from "@/lib/data/schema";
import type { HeldDocument } from "@/lib/unlock";

export interface TravelSearch {
  p?: string | undefined;
  d?: string | undefined;
  date?: string | undefined;
}

const TYPES: DocType[] = ["visa", "residence_permit", "permanent_residence"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "USA-visa,DEU-residence_permit" -> held documents. Unparseable parts are dropped. */
export function parseDocs(d?: string | undefined): HeldDocument[] {
  if (!d) return [];
  const seen = new Set<string>();
  return d
    .split(",")
    .map((segment) => {
      const i = segment.indexOf("-");
      if (i < 1) return undefined;
      return { issuer: segment.slice(0, i), type: segment.slice(i + 1) as DocType };
    })
    .filter((x): x is HeldDocument => {
      if (!x || !/^[A-Z][A-Z0-9_]{1,14}$/.test(x.issuer) || !TYPES.includes(x.type)) return false;
      const key = `${x.issuer}-${x.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const serializeDocs = (docs: readonly HeldDocument[]): string | undefined =>
  docs.length ? docs.map((x) => `${x.issuer}-${x.type}`).join(",") : undefined;

export const formatDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Parses ?date=YYYY-MM-DD, falling back to today when absent or malformed. */
export function parseDate(value?: string | undefined): Date {
  if (value && ISO_DATE.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function validateTravelSearch(s: Record<string, unknown>): TravelSearch {
  const str = (key: string) => (typeof s[key] === "string" ? (s[key] as string) : undefined);
  const date = str("date");
  return {
    p: str("p"),
    d: str("d"),
    date: date && ISO_DATE.test(date) ? date : undefined,
  };
}

/** Adapter for the client-side `useSearchParams()` hook. */
export function travelSearchFromParams(params: URLSearchParams): TravelSearch {
  return validateTravelSearch({
    p: params.get("p") ?? undefined,
    d: params.get("d") ?? undefined,
    date: params.get("date") ?? undefined,
  });
}
