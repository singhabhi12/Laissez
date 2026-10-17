import { describe, expect, it } from "vitest";
import { parseDocs, serializeDocs, travelSearchFromParams, validateTravelSearch } from "./query-state";
import { resultsHref, nextVisaHref, travelQuery } from "./routes";
import type { HeldDocument } from "@/lib/unlock";

const docs: HeldDocument[] = [
  { issuer: "USA", type: "visa" },
  { issuer: "EU", type: "residence_permit" },
];

describe("travel URL state", () => {
  it("round trips documents through the query string", () => {
    expect(parseDocs(serializeDocs(docs))).toEqual(docs);
  });
  it("serialises no documents as undefined", () => {
    expect(serializeDocs([])).toBeUndefined();
  });
  it("drops malformed document segments", () => {
    expect(parseDocs("USA-visa,nonsense,GBR-not_a_type")).toEqual([{ issuer: "USA", type: "visa" }]);
  });
  it("builds the shareable hrefs the UI links to", () => {
    expect(resultsHref({ passport: "IND", docs })).toBe("/results?p=IND&d=USA-visa%2CEU-residence_permit");
    expect(nextVisaHref({ passport: "IND" })).toBe("/next-visa?p=IND");
    expect(travelQuery()).toBe("");
  });
  it("parses a built href back into the same search", () => {
    const url = new URL(resultsHref({ passport: "IND", docs }), "https://example.test");
    const search = travelSearchFromParams(url.searchParams);
    expect(search.p).toBe("IND");
    expect(parseDocs(search.d)).toEqual(docs);
  });
  it("ignores non-string search values", () => {
    expect(validateTravelSearch({ p: ["IND", "NGA"], d: 42 })).toEqual({ p: undefined, d: undefined });
  });
});
