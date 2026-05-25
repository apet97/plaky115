import {
  PlakyAbortError,
  PlakyApiError,
  PlakyConnectionError,
  PlakyError,
  PlakyTimeoutError,
  classify,
} from "./errors.js";
import { buildUserAgent } from "./user-agent.js";
import type { Interceptors } from "./interceptors.js";
import type { RateLimitSink } from "./rate-limit.js";
import type {
  ApiKeyProvider,
  FetchLike,
  HeaderProvider,
  PlakyApiResponse,
  QueryParams,
  ResponseType,
} from "./types.js";

export type RawRequest = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: QueryParams | undefined;
  body?: unknown;
  operationId?: string | undefined;
  responseType?: ResponseType | undefined;
};

export type PlakyRequestOptions = {
  apiKey: ApiKeyProvider;
  serverURL: string;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  headers?: HeaderProvider | undefined;
  fetch?: FetchLike | undefined;
  interceptors?: Interceptors | undefined;
  signal?: AbortSignal | undefined;
  rateLimitSink?: RateLimitSink | undefined;
  idempotencyKey?: string | undefined;
  userAgent?: string | undefined;
  responseType?: ResponseType | undefined;
};

const DEFAULT_TIMEOUT_MS = 30_000;

export async function request<T>(req: RawRequest, opts: PlakyRequestOptions): Promise<T> {
  const response = await requestWithResponse<T>(req, opts);
  return response.data;
}

export async function requestWithResponse<T>(req: RawRequest, opts: PlakyRequestOptions): Promise<PlakyApiResponse<T>> {
  const fetchFn = getFetch(opts.fetch);
  const operationId = req.operationId ?? `${req.method} ${req.path}`;
  const maxRetries = canRetry(req, opts) ? opts.maxRetries ?? 0 : 0;

  for (let attempt = 0; ; attempt++) {
    const url = buildUrl(opts.serverURL, req.path, req.query);
    const headers = await buildHeaders(req, opts);
    const body = serializeBody(req.body, headers);
    const init: RequestInit = { method: req.method, headers };

    if (body !== undefined) init.body = body;
    if (opts.signal) init.signal = opts.signal;

    const intercepted = opts.interceptors?.request
      ? await opts.interceptors.request({ url, init, operationId })
      : { url, init };

    try {
      const response = await doFetch(fetchFn, intercepted.url, intercepted.init, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      opts.rateLimitSink?.observe(response.headers);

      if (shouldRetryResponse(req, opts, response, attempt, maxRetries)) {
        await delay(retryDelay(response, attempt), opts.signal);
        continue;
      }

      const requestId = getRequestId(response.headers);
      const responseType = req.responseType ?? opts.responseType ?? "json";

      if (!response.ok) {
        const errorBody = await parseErrorBody(response);
        await opts.interceptors?.response?.({
          url: intercepted.url,
          response,
          body: errorBody,
          operationId,
        });

        const errorInput = {
          status: response.status,
          method: req.method,
          url: intercepted.url,
          headers: response.headers,
          body: errorBody,
        };
        const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
        throw classify({
          ...errorInput,
          ...(requestId !== undefined ? { requestId } : {}),
          ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        });
      }

      const data = await parseResponse<T>(response, responseType);
      await opts.interceptors?.response?.({
        url: intercepted.url,
        response,
        body: data,
        operationId,
      });

      return {
        data,
        status: response.status,
        headers: response.headers,
        ...(requestId !== undefined ? { requestId } : {}),
      };
    } catch (error) {
      if (error instanceof PlakyAbortError || error instanceof PlakyApiError) throw error;

      if (error instanceof PlakyTimeoutError) {
        if (canRetryError(req, opts, attempt, maxRetries)) {
          await delay(retryDelay(undefined, attempt), opts.signal);
          continue;
        }
        throw error;
      }

      const connectionError =
        error instanceof PlakyConnectionError
          ? error
          : new PlakyConnectionError("Connection error while communicating with the Plaky API.", { cause: error });

      if (canRetryError(req, opts, attempt, maxRetries)) {
        await delay(retryDelay(undefined, attempt), opts.signal);
        continue;
      }

      throw connectionError;
    }
  }
}

async function buildHeaders(req: RawRequest, opts: PlakyRequestOptions): Promise<Headers> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("User-Agent", opts.userAgent ?? buildUserAgent());

  const apiKey = await resolveApiKey(opts.apiKey);
  headers.set("X-API-Key", apiKey);

  mergeHeadersInto(headers, await resolveHeaders(opts.headers));

  if (req.body !== undefined) {
    setContentTypeIfNeeded(req.body, headers);
  }

  if (opts.idempotencyKey && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", opts.idempotencyKey);
  }

  return headers;
}

function getFetch(fetchFn: FetchLike | undefined): FetchLike {
  const resolved = fetchFn ?? globalThis.fetch;
  if (!resolved) throw new Error("No fetch implementation found. Pass `fetch` to PlakyClient.");
  return resolved.bind(globalThis);
}

async function resolveApiKey(apiKey: ApiKeyProvider): Promise<string> {
  return typeof apiKey === "function" ? apiKey() : apiKey;
}

export async function resolveHeaders(headers: HeaderProvider | undefined): Promise<HeadersInit | undefined> {
  if (!headers) return undefined;
  return typeof headers === "function" ? headers() : headers;
}

export function mergeHeadersInto(target: Headers, source?: HeadersInit): void {
  if (!source) return;

  new Headers(source).forEach((value, key) => {
    if (value === "") target.delete(key);
    else target.set(key, value);
  });
}

function buildUrl(server: string, path: string, query?: QueryParams): string {
  const base = server.endsWith("/") ? server : `${server}/`;
  const url = new URL(path.replace(/^\//, ""), base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;

      if (isQueryArray(value)) {
        for (const item of value) url.searchParams.append(key, formatQueryValue(item));
      } else {
        url.searchParams.set(key, formatQueryValue(value));
      }
    }
  }

  return url.toString();
}

function formatQueryValue(value: string | number | boolean | Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isQueryArray(value: QueryParams[string]): value is readonly (string | number | boolean | Date)[] {
  return Array.isArray(value);
}

function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isBodyInit(body)) return body;

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

function setContentTypeIfNeeded(body: unknown, headers: Headers): void {
  if (!isBodyInit(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof ReadableStream !== "undefined" && value instanceof ReadableStream)
  );
}

async function doFetch(fetchFn: FetchLike, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const userSignal = init.signal as AbortSignal | undefined;
  let timedOut = false;

  const onAbort = () => controller.abort(userSignal?.reason);
  if (userSignal?.aborted) {
    controller.abort(userSignal.reason);
  } else {
    userSignal?.addEventListener("abort", onAbort, { once: true });
  }

  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;

  try {
    return await fetchFn(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (userSignal?.aborted) throw new PlakyAbortError("Request was aborted.", { cause: error });
    if (timedOut) throw new PlakyTimeoutError(`Request timed out after ${timeoutMs}ms.`, { cause: error });
    if (error instanceof PlakyError) throw error;
    throw new PlakyConnectionError("Connection error while communicating with the Plaky API.", { cause: error });
  } finally {
    if (timer) clearTimeout(timer);
    userSignal?.removeEventListener("abort", onAbort);
  }
}

async function parseResponse<T>(response: Response, responseType: ResponseType): Promise<T> {
  if (responseType === "void" || response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  if (responseType === "stream") return response.body as T;
  if (responseType === "bytes") return new Uint8Array(await response.arrayBuffer()) as T;
  if (responseType === "text") return response.text() as Promise<T>;

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getRequestId(headers: Headers): string | undefined {
  return headers.get("x-request-id") ?? headers.get("request-id") ?? headers.get("x-correlation-id") ?? undefined;
}

function shouldRetryResponse(
  req: RawRequest,
  opts: PlakyRequestOptions,
  response: Response,
  attempt: number,
  maxRetries: number,
): boolean {
  if (attempt >= maxRetries) return false;
  if (response.status !== 429 && (response.status < 500 || response.status > 599)) return false;
  return canRetry(req, opts);
}

function canRetryError(req: RawRequest, opts: PlakyRequestOptions, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) return false;
  return canRetry(req, opts);
}

function canRetry(req: RawRequest, opts: Pick<PlakyRequestOptions, "idempotencyKey">): boolean {
  return req.method === "GET" || opts.idempotencyKey !== undefined;
}

function retryDelay(response: Response | undefined, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const parsed = parseRetryAfter(retryAfter);
    if (parsed !== undefined) return clamp(parsed, 0, 60_000);
  }

  return 250 * 2 ** attempt;
}

function parseRetryAfter(header: string | null): number | undefined {
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

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new PlakyAbortError("Request was aborted."));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(new PlakyAbortError("Request was aborted."));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
