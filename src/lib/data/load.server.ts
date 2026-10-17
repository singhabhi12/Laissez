import { readFileSync } from "node:fs";
import path from "node:path";
import type { CountriesFile, IsoNumericFile, PassportFile, RulesFile, SharedData } from "./types";

/**
 * Server-side readers for the generated shards in public/data. Reading from disk
 * avoids an HTTP round trip to our own origin.
 *
 * The parsed files are cached in production, where they cannot change after the
 * build. In development they are re-read every time: `npm run data:build`
 * rewrites them while the dev server is running, and a stale cache would serve
 * shards that predate the regeneration.
 */
const DIR = path.join(process.cwd(), "public/data");
const CACHE = process.env.NODE_ENV === "production";

function read<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DIR, file), "utf8")) as T;
}

let shared: SharedData | undefined;

export function loadShared(): SharedData {
  if (!shared || !CACHE) {
    shared = {
      countries: read<CountriesFile>("countries.json"),
      rules: read<RulesFile>("rules.json"),
      isoNumeric: read<IsoNumericFile>("iso-numeric.json"),
    };
  }
  return shared;
}

const passports = new Map<string, PassportFile>();

/** Returns undefined for an unknown passport rather than throwing. */
export function loadPassport(iso3: string): PassportFile | undefined {
  if (!/^[A-Z]{3}$/.test(iso3)) return undefined;
  const cached = passports.get(iso3);
  if (cached && CACHE) return cached;
  try {
    const file = read<PassportFile>(`passports/${iso3}.json`);
    passports.set(iso3, file);
    return file;
  } catch {
    return undefined;
  }
}
