/** Context passed to a request interceptor before a request is sent. */
export type RequestInterceptorContext = {
  /** The fully built request URL, including query string. */
  url: string;
  /** The `fetch` init (method, headers, body) about to be sent. */
  init: RequestInit;
  /** The operation id (for example `listItems`) driving this request. */
  operationId: string;
};

/** Context passed to a response interceptor after a response is received. */
export type ResponseInterceptorContext = {
  /** The request URL that produced this response. */
  url: string;
  /** The raw `fetch` {@link Response}. */
  response: Response;
  /** The parsed response (or parsed error) body. */
  body: unknown;
  /** The operation id (for example `listItems`) driving this request. */
  operationId: string;
};

/**
 * Request/response hooks invoked around every API call. The `request` hook may
 * rewrite the URL/init (return the modified pair); the `response` hook is
 * observe-only. Both may be async. Set via `PlakyClientOptions.interceptors`.
 *
 * @example
 * ```ts
 * const client = new PlakyClient({
 *   apiKey,
 *   interceptors: {
 *     request: (ctx) => { console.log(ctx.operationId, ctx.url); return ctx; },
 *     response: (ctx) => { console.log(ctx.response.status); },
 *   },
 * });
 * ```
 */
export type Interceptors = {
  request?: (ctx: RequestInterceptorContext) => Promise<{ url: string; init: RequestInit }> | { url: string; init: RequestInit };
  response?: (ctx: ResponseInterceptorContext) => Promise<void> | void;
};
