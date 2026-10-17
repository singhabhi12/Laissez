"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CountryView } from "@/lib/data/types";
import type { DocType, Groups } from "@/lib/data/schema";

export interface ReferenceData {
  countries: Record<string, CountryView>;
  groups: Groups;
  documentTypes: Record<DocType, string>;
  /** The dataset's research date, shown as "last verified". */
  lastVerified: string;
}

interface ContextValue extends ReferenceData {
  /** Every country, sorted by name, for the pickers. */
  countryList: CountryView[];
  country: (iso3: string) => CountryView | undefined;
  /** Display name and flag for a country code or a group code. */
  issuerLabel: (code: string) => { name: string; flag: string };
}

const DataContext = createContext<ContextValue | null>(null);

const GROUP_NAMES: Record<string, string> = {
  SCHENGEN: "Schengen",
  EU: "EU",
  EEA: "EEA",
  GCC: "Gulf (GCC)",
};

export function DataProvider({ data, children }: { data: ReferenceData; children: ReactNode }) {
  const value = useMemo<ContextValue>(() => {
    const countryList = Object.values(data.countries).sort((a, b) => a.name.localeCompare(b.name));
    const country = (iso3: string) => data.countries[iso3];
    return {
      ...data,
      countryList,
      country,
      issuerLabel: (code: string) => {
        if (data.groups[code]) return { name: GROUP_NAMES[code] ?? code, flag: code === "GCC" ? "🌐" : "🇪🇺" };
        const c = country(code);
        return { name: c?.name ?? code, flag: c?.flagEmoji ?? "🏳️" };
      },
    };
  }, [data]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): ContextValue {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData must be used inside <DataProvider>");
  return value;
}
