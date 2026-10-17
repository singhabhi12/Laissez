import type { Route } from "next";
import type { HeldDocument } from "@/lib/unlock";
import { serializeDocs } from "./query-state";

export interface TravelQuery {
  passport?: string | undefined;
  docs?: readonly HeldDocument[] | undefined;
  /** YYYY-MM-DD; omitted means "today". */
  date?: string | undefined;
}

/**
 * Single place that builds the shareable travel URLs. Nothing else may
 * hand-assemble a query string, so the shape of ?p=&d=&date= stays in one file
 * alongside the parser in query-state.ts.
 *
 * The `as Route` casts satisfy Next's typedRoutes, which cannot narrow a
 * template literal to a known route on its own.
 */
export function travelQuery({ passport, docs = [], date }: TravelQuery = {}): string {
  const params = new URLSearchParams();
  if (passport) params.set("p", passport);
  const d = serializeDocs(docs);
  if (d) params.set("d", d);
  if (date) params.set("date", date);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const resultsHref = (q: TravelQuery = {}) => `/results${travelQuery(q)}` as Route;

/** /india/with-us-visa */
export const landingHref = (passportSlug: string, documentSlug: string) =>
  `/${passportSlug}/with-${documentSlug}` as Route;
export const nextVisaHref = (q: TravelQuery = {}) => `/next-visa${travelQuery(q)}` as Route;
