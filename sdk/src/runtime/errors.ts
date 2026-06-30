/**
 * Base class for every error thrown by the SDK. `name` is set to the concrete
 * subclass name. Use `instanceof` to branch on specific cases.
 */
export class PlakyError extends Error {
  override readonly name: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = new.target.name;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

/** Thrown when the request never reaches the server (DNS, TCP, TLS failures). */
export class PlakyConnectionError extends PlakyError {}

/** Thrown when a request exceeds the configured timeout. */
export class PlakyTimeoutError extends PlakyError {
  constructor(message = "Request timed out.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

/** Thrown when a request is aborted via an `AbortSignal`. */
export class PlakyAbortError extends PlakyError {
  constructor(message = "Request was aborted.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

/**
 * Thrown when a 2xx response body cannot be parsed (for example malformed JSON
 * from a proxy/gateway, a truncated payload, or a charset mishap). This is a
 * deterministic decode failure, not a transport failure, so it is **not**
 * retried and is never misreported as a {@link PlakyConnectionError}. The
 * underlying error is preserved as `cause`.
 */
export class PlakyDecodeError extends PlakyError {
  /** HTTP status of the response that failed to parse, when known. */
  readonly status?: number;
  /** Correlation id from the response, when present. */
  readonly requestId?: string;

  constructor(message: string, options?: { cause?: unknown; status?: number; requestId?: string }) {
    super(message, options);
    if (options?.status !== undefined) this.status = options.status;
    if (options?.requestId !== undefined) this.requestId = options.requestId;
  }
}

export type ApiErrorInput = {
  status: number;
  method: string;
  url: string;
  headers: Headers;
  body?: unknown;
  requestId?: string | undefined;
  retryAfterMs?: number | undefined;
};

/**
 * Thrown for any non-2xx API response. Carries `status`, `method`, `url`,
 * response `headers`, parsed `body`, and—when present—`requestId`, the API
 * error `code`, and `retryAfterMs`. {@link classify} narrows this to a
 * status-specific subclass.
 */
export class PlakyApiError extends PlakyError {
  readonly status: number;
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  readonly body?: unknown;
  readonly requestId?: string;
  readonly code?: string;
  readonly retryAfterMs?: number;

  constructor(message: string, input: ApiErrorInput) {
    super(message);
    this.status = input.status;
    this.method = input.method;
    this.url = input.url;
    this.headers = input.headers;
    if (input.body !== undefined) this.body = input.body;
    if (input.requestId !== undefined) this.requestId = input.requestId;
    if (input.retryAfterMs !== undefined) this.retryAfterMs = input.retryAfterMs;

    const code = readErrorCode(input.body);
    if (code !== undefined) this.code = code;
  }
}

/** HTTP 401. The API key is missing or invalid. */
export class PlakyAuthError extends PlakyApiError {}
/** HTTP 403. The key lacks permission for the resource. */
export class PlakyPermissionError extends PlakyApiError {}
/** HTTP 404. The resource does not exist. */
export class PlakyNotFoundError extends PlakyApiError {}
/** HTTP 409. A conflict, such as a duplicate or version mismatch. */
export class PlakyConflictError extends PlakyApiError {}
/** HTTP 400. The request was malformed or failed validation. */
export class PlakyValidationError extends PlakyApiError {}
/** HTTP 422. The request was well-formed but semantically rejected. */
export class PlakyUnprocessableEntityError extends PlakyApiError {}
/** HTTP 429. Rate limited; inspect `retryAfterMs` to back off. */
export class PlakyRateLimitError extends PlakyApiError {}
/** HTTP 5xx. A server-side error. */
export class PlakyServerError extends PlakyApiError {}

/**
 * Thrown by resolver helpers when a lookup matches more than one entity.
 * `candidates` holds the ambiguous matches.
 */
export class PlakyAmbiguousMatchError extends PlakyError {
  constructor(message: string, readonly candidates: unknown[]) {
    super(message);
  }
}

/**
 * Map an API error response to the most specific {@link PlakyApiError} subclass
 * by status code.
 *
 * @param input - Status, method, url, headers, and parsed body.
 * @returns A status-specific error instance (falls back to {@link PlakyApiError}).
 */
export function classify(input: ApiErrorInput): PlakyApiError {
  const message = readErrorMessage(input.body) ?? `HTTP ${input.status}`;

  if (input.status === 401) return new PlakyAuthError(message, input);
  if (input.status === 403) return new PlakyPermissionError(message, input);
  if (input.status === 404) return new PlakyNotFoundError(message, input);
  if (input.status === 409) return new PlakyConflictError(message, input);
  if (input.status === 400) return new PlakyValidationError(message, input);
  if (input.status === 422) return new PlakyUnprocessableEntityError(message, input);
  if (input.status === 429) return new PlakyRateLimitError(message, input);
  if (input.status >= 500 && input.status <= 599) return new PlakyServerError(message, input);

  return new PlakyApiError(message, input);
}

function readErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string") return body;
  if (!body || typeof body !== "object") return undefined;

  const value = body as {
    message?: unknown;
    error?: {
      message?: unknown;
    };
  };

  if (typeof value.error?.message === "string") return value.error.message;
  if (typeof value.message === "string") return value.message;

  return undefined;
}

function readErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;

  const value = body as {
    code?: unknown;
    error?: {
      code?: unknown;
    };
  };

  if (typeof value.error?.code === "string") return value.error.code;
  if (typeof value.code === "string") return value.code;

  return undefined;
}
