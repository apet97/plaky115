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

  return 250 * 2 ** attempt;
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
