import { PlakyApiError, PlakyRateLimitError } from "./errors.js";

export type RetryOptions = {
  maxRetries: number;
  baseDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
};

export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = { maxRetries: 2 },
): Promise<T> {
  const base = opts.baseDelayMs ?? 250;
  const isRetryable = opts.isRetryable ?? defaultRetryable;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.maxRetries || !isRetryable(err)) throw err;
      const wait = err instanceof PlakyRateLimitError && err.retryAfterMs ? err.retryAfterMs : base * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait + Math.random() * 100));
    }
  }
}

function defaultRetryable(err: unknown): boolean {
  if (err instanceof PlakyRateLimitError) return true;
  if (err instanceof PlakyApiError) return err.status >= 500 && err.status < 600;
  return false;
}
