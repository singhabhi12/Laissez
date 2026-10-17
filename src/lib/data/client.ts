"use client";

import type { PassportFile } from "./types";

/**
 * Fetches one passport shard on demand and remembers it, so switching passports
 * costs a single <5 kB request and switching back costs nothing.
 */
const cache = new Map<string, PassportFile>();
const inFlight = new Map<string, Promise<PassportFile>>();

export function cachedPassport(iso3: string): PassportFile | undefined {
  return cache.get(iso3);
}

export function primePassport(file: PassportFile): void {
  cache.set(file.passport, file);
}

export function fetchPassport(iso3: string): Promise<PassportFile> {
  const hit = cache.get(iso3);
  if (hit) return Promise.resolve(hit);
  const pending = inFlight.get(iso3);
  if (pending) return pending;

  const promise = fetch(`/data/passports/${iso3}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Could not load data for ${iso3} (${res.status})`);
      return res.json() as Promise<PassportFile>;
    })
    .then((file) => {
      cache.set(iso3, file);
      inFlight.delete(iso3);
      return file;
    })
    .catch((error: unknown) => {
      inFlight.delete(iso3);
      throw error;
    });

  inFlight.set(iso3, promise);
  return promise;
}
