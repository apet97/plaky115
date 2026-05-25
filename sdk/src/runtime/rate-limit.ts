// Plaky publishes a 200 req/min/user cap but does not echo
// X-RateLimit-* headers. RateLimitSink combines two views:
// 1. Header-based snapshot (`.last`) — populated if/when Plaky starts
//    emitting standard headers.
// 2. Client-side rolling window — every request the SDK makes is
//    recorded so callers can ask `.estimatedRemaining()` without
//    waiting for a 429.

export type RateLimitSnapshot = {
  limit?: number | undefined;
  remaining?: number | undefined;
  resetAt?: number | undefined;
};

export type RateLimitOptions = {
  windowMs?: number;
  maxPerWindow?: number;
};

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 200;

export class RateLimitSink {
  last: RateLimitSnapshot = {};
  readonly windowMs: number;
  readonly maxPerWindow: number;
  private timestamps: number[] = [];

  constructor(opts: RateLimitOptions = {}) {
    this.windowMs = opts.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
    this.maxPerWindow = opts.maxPerWindow ?? DEFAULT_RATE_LIMIT_MAX;
  }

  observe(headers: Headers): void {
    const limit = parseNum(headers.get("x-ratelimit-limit"));
    const remaining = parseNum(headers.get("x-ratelimit-remaining"));
    const reset = parseNum(headers.get("x-ratelimit-reset"));
    const snap: RateLimitSnapshot = {};
    if (limit !== undefined) snap.limit = limit;
    if (remaining !== undefined) snap.remaining = remaining;
    if (reset !== undefined) snap.resetAt = reset > 1_000_000_000 ? reset * 1000 : reset;
    this.last = snap;
    this.record();
  }

  /** Record a request timestamp for the rolling-window estimator. */
  record(now: number = Date.now()): void {
    this.timestamps.push(now);
    this.prune(now);
  }

  /** Returns how many slots remain in the current rolling window. */
  estimatedRemaining(now: number = Date.now()): number {
    this.prune(now);
    // Prefer the server's count when available, otherwise local.
    if (typeof this.last.remaining === "number") return this.last.remaining;
    return Math.max(0, this.maxPerWindow - this.timestamps.length);
  }

  /** True when the next request would exceed the published cap. */
  wouldThrottle(now: number = Date.now()): boolean {
    return this.estimatedRemaining(now) <= 0;
  }

  /** Milliseconds until the oldest request in the window expires. */
  msUntilNextSlot(now: number = Date.now()): number {
    this.prune(now);
    if (this.timestamps.length < this.maxPerWindow) return 0;
    const oldest = this.timestamps[0] ?? now;
    return Math.max(0, oldest + this.windowMs - now);
  }

  reset(): void {
    this.timestamps = [];
    this.last = {};
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    let drop = 0;
    while (drop < this.timestamps.length && (this.timestamps[drop] ?? 0) <= cutoff) drop++;
    if (drop > 0) this.timestamps.splice(0, drop);
  }
}

function parseNum(v: string | null): number | undefined {
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
