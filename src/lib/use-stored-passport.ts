"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "lastPassport";
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function snapshot(): string | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && /^[A-Z]{3}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The last passport the visitor chose. Read through useSyncExternalStore so the
 * server snapshot is null and nothing is mirrored into state from an effect.
 */
export function useStoredPassport(): [string | null, (iso3: string) => void] {
  const stored = useSyncExternalStore(subscribe, snapshot, () => null);
  const remember = useCallback((iso3: string) => {
    try {
      localStorage.setItem(KEY, iso3);
    } catch {
      // Private mode or blocked storage: remembering is a convenience only.
    }
    emit();
  }, []);
  return [stored, remember];
}
