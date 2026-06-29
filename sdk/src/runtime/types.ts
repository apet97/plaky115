/** A `fetch`-compatible function. Supply a custom one to mock or proxy requests. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * API key source: either the key string or a (possibly async) function that
 * returns it. A function lets you refresh or fetch the key lazily per request.
 */
export type ApiKeyProvider = string | (() => string | Promise<string>);

/**
 * Extra headers to merge into every request: either a `HeadersInit` or a
 * (possibly async) function returning one, evaluated per request.
 */
export type HeaderProvider = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

/** A scalar query value the SDK knows how to serialize. */
export type QueryPrimitive = string | number | boolean | Date;
/** A query value: a scalar, an array of scalars, or absent. */
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | null | undefined;
/** A map of query-parameter names to values. */
export type QueryParams = Record<string, QueryValue>;

/** How a response body is parsed. `json` is the default for all API operations. */
export type ResponseType = "json" | "text" | "bytes" | "stream" | "void";

/** Per-request overrides accepted by every resource method's `options` argument. */
export type PlakyRequestOverrides = {
  /** Abort signal to cancel the request. */
  signal?: AbortSignal | undefined;
  /** Override the client's request timeout for this call, in milliseconds. */
  timeoutMs?: number | undefined;
  /** Override the client's retry count for this call. */
  maxRetries?: number | undefined;
  /** Additional headers to merge for this call. */
  headers?: HeaderProvider | undefined;
  /** Idempotency key to attach (writes only); reuse across retries to dedupe. */
  idempotencyKey?: string | undefined;
  /** Override how the response body is parsed for this call. */
  responseType?: ResponseType | undefined;
};

/**
 * Full response envelope returned by `requestWithResponse` and the `*WithResponse`
 * helpers: the parsed `data` plus transport metadata.
 *
 * @typeParam T - The parsed response body type.
 */
export type PlakyApiResponse<T> = {
  /** The parsed response body. */
  data: T;
  /** The HTTP status code. */
  status: number;
  /** The response headers. */
  headers: Headers;
  /** The server request id, when the response carried one. */
  requestId?: string | undefined;
};
