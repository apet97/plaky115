const SECRET = /plk_[A-Za-z0-9_-]+/g;

/**
 * Replace every `plk_`-style API key in a string with `plk_***`. Use before
 * logging or surfacing any value that might contain a key.
 *
 * @param value - Arbitrary text that may embed an API key.
 * @returns The text with API keys masked.
 * @example
 * ```ts
 * console.log(redact(`auth failed for plk_live_abc123`)); // "auth failed for plk_***"
 * ```
 */
export function redact(value: string): string {
  return value.replace(SECRET, "plk_***");
}

/**
 * Deep-redact `plk_`-style API keys from any JSON-serializable value by
 * round-tripping through {@link redact}. Non-serializable fields (functions,
 * symbols) are dropped, as with `JSON.stringify`.
 *
 * @typeParam T - The value's type, preserved on the returned clone.
 * @param value - A JSON-serializable value to scrub.
 * @returns A redacted deep clone of `value`.
 */
export function redactRecord<T>(value: T): T {
  return JSON.parse(redact(JSON.stringify(value))) as T;
}
