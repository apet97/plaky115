const PLAKY_API_KEY_PATTERN = /plk_[A-Za-z0-9_-]+/g;
const PLAKY_API_KEY_REDACTION_MARKER = "[REDACTED_PLAKY_API_KEY]";

/**
 * Replace every `plk_`-style API key in a string with the canonical marker. Use before
 * logging or surfacing any value that might contain a key.
 *
 * @param value - Arbitrary text that may embed an API key.
 * @returns The text with API keys masked.
 */
export function redact(value: string): string {
  return value.replace(PLAKY_API_KEY_PATTERN, PLAKY_API_KEY_REDACTION_MARKER);
}

/**
 * Deep-redact `plk_`-style API keys from any JSON-serializable value by
 * round-tripping through {@link redact}. Non-serializable fields (functions,
 * symbols) are dropped, as with `JSON.stringify`. A top-level value that
 * `JSON.stringify` cannot serialize (a bare `undefined`, function, or symbol)
 * is returned unchanged rather than throwing.
 *
 * @typeParam T - The value's type, preserved on the returned clone.
 * @param value - A JSON-serializable value to scrub.
 * @returns A redacted deep clone of `value`.
 */
export function redactRecord<T>(value: T): T {
  const json = JSON.stringify(value);
  if (json === undefined) return value;
  return JSON.parse(redact(json)) as T;
}
