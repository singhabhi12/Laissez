/**
 * Fixed-window rate limiting held in memory: this app has no database, and a
 * report endpoint does not justify adding one.
 *
 * The limitation is real and deliberate: the window lives in one server
 * process, so it resets on redeploy and is not shared between instances. It
 * stops casual repeat submissions, not a determined attacker.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window frees up, when blocked. */
  retryAfter: number;
}

export interface RateLimiter {
  check: (key: string, now?: number) => RateLimitResult;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    check(key, now = Date.now()) {
      const cutoff = now - windowMs;

      // Opportunistic cleanup so the map cannot grow without bound.
      if (hits.size > 10_000) {
        for (const [k, times] of hits) {
          const live = times.filter((t) => t > cutoff);
          if (live.length) hits.set(k, live);
          else hits.delete(k);
        }
      }

      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (recent.length >= limit) {
        const oldest = recent[0]!;
        return {
          ok: false,
          remaining: 0,
          retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
        };
      }

      recent.push(now);
      hits.set(key, recent);
      return { ok: true, remaining: limit - recent.length, retryAfter: 0 };
    },
  };
}

/** The client IP, as far as the proxy in front of us reports it. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
