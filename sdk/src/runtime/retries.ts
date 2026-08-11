import { PlakyApiError, PlakyRateLimitError } from "./errors.js";

/** Options for {@link withRetries}. */
export type RetryOptions = {
  /** Explicitly identifies this helper as read-only. */
  kind: "read";
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
 * const me = await withRetries(() => client.users.me(), { kind: "read", maxRetries: 3 });
 * ```
 */
export function withRetries<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T>;
/** @deprecated Pass `kind: "read"` explicitly. This compatibility overload is read-only at runtime. */
export function withRetries<T>(fn: () => Promise<T>, opts: Omit<RetryOptions, "kind">): Promise<T>;
export async function withRetries<T>(
  fn: () => Promise<T>,
  opts: RetryOptions | Omit<RetryOptions, "kind"> = { kind: "read", maxRetries: 2 },
): Promise<T> {
  if ("kind" in opts && opts.kind !== "read") throw new Error("withRetries only supports kind=read");
  const options = opts as RetryOptions;
  const base = options.baseDelayMs ?? 250;
  assertRetryValue(options.maxRetries, "maxRetries", true);
  assertRetryValue(base, "baseDelayMs", false);
  const isRetryable = options.isRetryable ?? defaultRetryable;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= options.maxRetries || !isRetryable(err)) throw err;
      // Honor a server Retry-After but clamp it to [0, 60000] (same bound as the
      // transport) so a hostile/buggy value can't overflow setTimeout's 2^31
      // limit and fire immediately, or a negative value bypass the backoff.
      const retryAfter = err instanceof PlakyRateLimitError ? err.retryAfterMs : undefined;
      const wait = retryAfter !== undefined && retryAfter > 0 ? Math.min(retryAfter, 60_000) : base * 2 ** attempt;
      await new Promise((r) => setTimeout(r, wait + Math.random() * 100));
    }
  }
}

function assertRetryValue(value: number, name: string, integer: boolean): void {
  if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new Error(`${name} must be a finite non-negative${integer ? " integer" : " number"}`);
  }
}

function defaultRetryable(err: unknown): boolean {
  if (err instanceof PlakyRateLimitError) return true;
  if (err instanceof PlakyApiError) return err.status >= 500 && err.status < 600;
  return false;
}
