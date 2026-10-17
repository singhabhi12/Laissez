"use client";

import { useEffect, useState } from "react";

/**
 * True once the browser is idle after hydration.
 *
 * The map is the heaviest thing on /results (react-simple-maps + d3) and it is
 * the default view, so its chunk evaluates on the critical path and pushes out
 * the largest-contentful paint. Waiting for idle lets the rest of the page
 * settle first; the placeholder already reserves the exact height, so nothing
 * moves when it arrives.
 */
export function useDeferredMount(timeout = 1500): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(done, { timeout });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = window.setTimeout(done, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [timeout]);

  return ready;
}
