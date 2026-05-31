import { PlakyAbortError, PlakyApiError, PlakyConnectionError, PlakyTimeoutError, classify } from "./errors.js";
import { buildHeaders, buildUrl, serializeBody } from "./internal/request-builders.js";
import { doFetch, getFetch } from "./internal/fetcher.js";
import { getRequestId, parseErrorBody, parseResponse } from "./internal/responses.js";
import { canRetry, canRetryError, parseRetryAfter, retryDelay, shouldRetryResponse } from "./internal/retry-policy.js";
import type { Interceptors } from "./interceptors.js";
import type { RateLimitSink } from "./rate-limit.js";
import type { ApiKeyProvider, FetchLike, HeaderProvider, PlakyApiResponse, QueryParams, ResponseType } from "./types.js";

export { mergeHeadersInto, resolveHeaders } from "./internal/request-builders.js";

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

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new PlakyAbortError("Request was aborted."));

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new PlakyAbortError("Request was aborted."));
    };

    timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
