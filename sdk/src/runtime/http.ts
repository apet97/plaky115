import { PlakyApiError, PlakyRateLimitError, classify } from "./errors.js";
import { buildUserAgent } from "./user-agent.js";
import type { Interceptors } from "./interceptors.js";
import type { RateLimitSink } from "./rate-limit.js";

export type PlakyRequestOptions = {
  apiKey: string;
  serverURL: string;
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  interceptors?: Interceptors;
  signal?: AbortSignal;
  rateLimitSink?: RateLimitSink;
  idempotencyKey?: string;
  userAgent?: string;
};

export type RawRequest = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, unknown> | undefined;
  body?: unknown;
  operationId: string;
};

export async function request<T>(req: RawRequest, opts: PlakyRequestOptions): Promise<T> {
  const maxRetries = canRetry(req, opts) ? opts.maxRetries ?? 0 : 0;
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestOnce<T>(req, opts);
    } catch (err) {
      if (attempt >= maxRetries || !isRetryable(err)) throw err;
      await delay(retryDelay(err, attempt));
    }
  }
}

async function requestOnce<T>(req: RawRequest, opts: PlakyRequestOptions): Promise<T> {
  const url = buildUrl(opts.serverURL, req.path, req.query);
  const headers: Record<string, string> = {
    "X-API-Key": opts.apiKey,
    Accept: "application/json",
    "User-Agent": opts.userAgent ?? buildUserAgent(),
  };
  if (opts.headers) Object.assign(headers, opts.headers);
  if (req.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

  const init: RequestInit = { method: req.method, headers };
  if (req.body !== undefined) init.body = JSON.stringify(req.body);
  if (opts.signal) init.signal = opts.signal;

  const intercepted = opts.interceptors?.request
    ? await opts.interceptors.request({ url, init, operationId: req.operationId })
    : { url, init };
  const response = await doFetch(intercepted.url, intercepted.init, opts.timeoutMs ?? 30_000);

  opts.rateLimitSink?.observe(response.headers);
  const requestId = response.headers.get("x-request-id") ?? undefined;
  const text = await response.text();
  const body: unknown = text ? safeParse(text) : undefined;

  await opts.interceptors?.response?.({
    url: intercepted.url,
    response,
    body,
    operationId: req.operationId,
  });

  if (!response.ok) {
    const message = isMessageBody(body) ? body.message : response.statusText;
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    throw classify(response.status, message, requestId, body, retryAfter);
  }
  return body as T;
}

function canRetry(req: RawRequest, opts: PlakyRequestOptions): boolean {
  return req.method === "GET" || opts.idempotencyKey !== undefined;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof PlakyRateLimitError) return true;
  if (err instanceof PlakyApiError) return err.status >= 500 && err.status < 600;
  return false;
}

function retryDelay(err: unknown, attempt: number): number {
  if (err instanceof PlakyRateLimitError && err.retryAfterMs !== undefined) return err.retryAfterMs;
  return 250 * 2 ** attempt;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMessageBody(body: unknown): body is { message: string } {
  return typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string";
}

function buildUrl(server: string, path: string, query?: Record<string, unknown>): string {
  const base = server.endsWith("/") ? server : `${server}/`;
  const u = new URL(path.replace(/^\//, ""), base);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) for (const item of v) u.searchParams.append(k, String(item));
      else u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

async function doFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  const userSignal = init.signal as AbortSignal | undefined;
  userSignal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    userSignal?.removeEventListener("abort", onAbort);
  }
}
