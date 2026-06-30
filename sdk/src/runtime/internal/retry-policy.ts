import type { PlakyRequestOptions, RawRequest } from "../http.js";

export function shouldRetryResponse(
  req: RawRequest,
  opts: Pick<PlakyRequestOptions, "idempotencyKey">,
  response: Response,
  attempt: number,
  maxRetries: number,
): boolean {
  if (attempt >= maxRetries) return false;
  if (response.status !== 429 && (response.status < 500 || response.status > 599)) return false;
  return canRetry(req, opts);
}

export function canRetryError(
  req: RawRequest,
  opts: Pick<PlakyRequestOptions, "idempotencyKey">,
  attempt: number,
  maxRetries: number,
): boolean {
  if (attempt >= maxRetries) return false;
  return canRetry(req, opts);
}

export function canRetry(req: RawRequest, opts: Pick<PlakyRequestOptions, "idempotencyKey">): boolean {
  return req.method === "GET" || opts.idempotencyKey !== undefined;
}

export function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const parsed = parseRetryAfter(retryAfter);
    if (parsed !== undefined) return clamp(parsed, 0, 60_000);
  }

  // Equal jitter (half-to-full: range [capped/2, capped)) on an exponential
  // backoff capped at 60s. The cap keeps the delay under setTimeout's 2^31 ms
  // ceiling for large retry budgets, and the jitter avoids a thundering herd of
  // clients retrying the same 5xx in lockstep. The capped/2 floor is deliberate
  // (keeps a minimum backoff so retries don't collapse toward 0) — do not
  // "simplify" to Math.random()*capped (true full jitter), which can return ~0.
  const capped = Math.min(60_000, 250 * 2 ** attempt);
  return capped / 2 + Math.random() * (capped / 2);
}

export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());

  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
