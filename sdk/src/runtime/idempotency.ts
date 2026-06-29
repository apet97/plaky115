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

/**
 * Resolve the idempotency key for a write in one place: an explicit per-call
 * `params.idempotencyKey` wins, then a per-request `options.idempotencyKey`,
 * otherwise a fresh generated key. Centralizes the precedence the resource
 * methods all share.
 *
 * @param params - Method params that may carry an explicit `idempotencyKey`.
 * @param options - Per-request overrides that may carry an `idempotencyKey`.
 * @param prefix - Prefix for the generated fallback (see {@link newIdempotencyKey}).
 * @returns The resolved idempotency key.
 */
export function resolveIdempotencyKey(
  params: { idempotencyKey?: string | undefined },
  options: { idempotencyKey?: string | undefined } | undefined,
  prefix: string,
): string {
  return params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey(prefix);
}
