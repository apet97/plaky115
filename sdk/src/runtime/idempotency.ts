import { randomUUID } from "node:crypto";

/**
 * Generate a fresh caller-managed idempotency key for a mutating request. The
 * SDK does not attach one automatically or retry writes. Use this helper only
 * when an application explicitly wants a stable request identifier.
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
 * Resolve the idempotency key using the legacy generated-fallback behavior: an explicit per-call
 * `params.idempotencyKey` wins, then a per-request `options.idempotencyKey`,
 * otherwise a fresh generated key. Centralizes the precedence the resource
 * methods all share.
 *
 * @param params - Method params that may carry an explicit `idempotencyKey`.
 * @param options - Per-request overrides that may carry an `idempotencyKey`.
 * @param prefix - Prefix for the generated fallback (see {@link newIdempotencyKey}).
 * @returns The resolved idempotency key.
 * @deprecated Resource methods no longer generate keys implicitly. Use
 * {@link resolveExplicitIdempotencyKey} when resolving request inputs.
 */
export function resolveIdempotencyKey(
  params: { idempotencyKey?: string | undefined },
  options: { idempotencyKey?: string | undefined } | undefined,
  prefix: string,
): string {
  return params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey(prefix);
}

/**
 * Resolve only a caller-supplied idempotency key. A value on `params` wins over
 * the per-request options value; when neither is present, no header is sent.
 */
export function resolveExplicitIdempotencyKey(
  params: { idempotencyKey?: string | undefined },
  options: { idempotencyKey?: string | undefined } | undefined,
): string | undefined {
  return params.idempotencyKey ?? options?.idempotencyKey;
}
