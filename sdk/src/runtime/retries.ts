import { PlakyApiError, PlakyRateLimitError } from "./errors.js";

/** Options for {@link withRetries}. */
export type RetryOptions = {
  /** Maximum number of retries after the first attempt (0 disables retries). */
  maxRetries: number;
  /** Base backoff in milliseconds; doubled per attempt. Defaults to `250`. */
  baseDelayMs?: number;
  /**
   * Predicate deciding whether an error is retryable. Defaults to retrying
   * {@link PlakyRateLimitError} and 5xx {@link PlakyApiError}s.
   */
  isRetryable?: (err: unknown) => boolean;
};

/**
 * Run `fn`, retrying on retryable errors with exponential backoff plus jitter.
 * When the error is a {@link PlakyRateLimitError} carrying `retryAfterMs`, that
 * delay is honored instead of the computed backoff.
 *
 * @typeParam T - The resolved value of `fn`.
 * @param fn - The async operation to attempt.
 * @param opts - Retry behavior (see {@link RetryOptions}). Defaults to two retries.
 * @returns The first successful result of `fn`.
 * @throws The last error if retries are exhausted or the error is not retryable.
 * @example
 * ```ts
 * const me = await withRetries(() => client.users.me(), { maxRetries: 3 });
 * ```
 */
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
