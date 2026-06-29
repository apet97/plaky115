import { randomUUID } from "node:crypto";

/**
 * Generate a fresh idempotency key for a mutating request. The SDK attaches one
 * automatically to writes; call this only when you want to reuse the same key
 * across an explicit retry so the server treats the calls as one operation.
 *
 * @param prefix - Short label prepended to the random UUID (defaults to `idmp`).
 * @returns A key of the form `"<prefix>_<uuid>"`.
 * @example
 * ```ts
 * const key = newIdempotencyKey("reactions");
 * await client.reactions.replace({ ...params, idempotencyKey: key });
 * ```
 */
export function newIdempotencyKey(prefix = "idmp"): string {
  return `${prefix}_${randomUUID()}`;
}
