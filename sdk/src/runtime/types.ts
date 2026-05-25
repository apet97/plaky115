export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ApiKeyProvider = string | (() => string | Promise<string>);

export type HeaderProvider = HeadersInit | (() => HeadersInit | Promise<HeadersInit>);

export type QueryPrimitive = string | number | boolean | Date;
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[] | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export type ResponseType = "json" | "text" | "bytes" | "stream" | "void";

export type PlakyRequestOverrides = {
  signal?: AbortSignal | undefined;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  headers?: HeaderProvider | undefined;
  idempotencyKey?: string | undefined;
  responseType?: ResponseType | undefined;
};

export type PlakyApiResponse<T> = {
  data: T;
  status: number;
  headers: Headers;
  requestId?: string | undefined;
};
