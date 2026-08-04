import { redact, redactRecord } from "./redact.js";

/**
 * Base class for every error thrown by the SDK. `name` is set to the concrete
 * subclass name. Use `instanceof` to branch on specific cases.
 */
const MAX_PRESENTATION_MESSAGE_LENGTH = 1_024;

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

/** Thrown before a non-streaming response body can exceed its configured limit. */
export class PlakyResponseTooLargeError extends PlakyError {
  constructor(readonly limit: number) {
    super(`Plaky API response exceeds the ${limit}-byte buffer limit.`);
  }
}

export type NormalizedProblemFamily = "validation" | "legacy" | "rfc7807" | "unknown";

/** A safe, additive view of the API's observed error-envelope families. */
export type NormalizedProblem = {
  readonly family: NormalizedProblemFamily;
  readonly status: number;
  readonly message: string;
  readonly code?: string | number;
  readonly label?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly instance?: string;
  readonly type?: string;
  readonly violations?: readonly unknown[];
};

/** Compatibility alias for callers that prefer the Plaky-prefixed name. */
export type PlakyProblem = NormalizedProblem;

export type ApiErrorInput = {
  status: number;
  method: string;
  url: string;
  headers: Headers;
  body?: unknown;
  problem?: NormalizedProblem | undefined;
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
  /** Normalized, redacted presentation view; {@link body} remains the raw bounded body. */
  readonly problem?: NormalizedProblem;
  readonly requestId?: string;
  readonly code?: string | number;
  readonly retryAfterMs?: number;

  constructor(message: string, input: ApiErrorInput) {
    super(message);
    this.status = input.status;
    this.method = input.method;
    this.url = input.url;
    this.headers = input.headers;
    if (input.body !== undefined) this.body = input.body;
    if (input.problem !== undefined) this.problem = input.problem;
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
  const problem = input.problem ?? normalizeProblem(input.body, input.status);
  const message = problem.message;
  const errorInput = { ...input, problem };

  if (input.status === 401) return new PlakyAuthError(message, errorInput);
  if (input.status === 403) return new PlakyPermissionError(message, errorInput);
  if (input.status === 404) return new PlakyNotFoundError(message, errorInput);
  if (input.status === 409) return new PlakyConflictError(message, errorInput);
  if (input.status === 400) return new PlakyValidationError(message, errorInput);
  if (input.status === 422) return new PlakyUnprocessableEntityError(message, errorInput);
  if (input.status === 429) return new PlakyRateLimitError(message, errorInput);
  if (input.status >= 500 && input.status <= 599) return new PlakyServerError(message, errorInput);

  return new PlakyApiError(message, errorInput);
}

export function normalizeProblem(body: unknown, status: number): NormalizedProblem {
  if (typeof body === "string") {
    return { family: "unknown", status, message: presentationText(body) };
  }

  const value = asRecord(body);
  const nested = asRecord(value?.["error"]);
  const detail = stringValue(value?.["detail"]);
  const topMessage = stringValue(value?.["message"]);
  const nestedMessage = stringValue(nested?.["message"]) ?? (typeof value?.["error"] === "string" ? value["error"] : undefined);
  const title = stringValue(value?.["title"]);
  const label = stringValue(value?.["errorLabel"]);
  const code = readErrorCode(body);
  const instance = stringValue(value?.["instance"]);
  const type = stringValue(value?.["type"]);
  const violations = Array.isArray(value?.["violations"]) ? value["violations"].slice(0, 100) : undefined;
  const message = detail ?? topMessage ?? nestedMessage ?? title ?? label ?? `HTTP ${status}`;
  const problem: NormalizedProblem = {
    family: problemFamily(value),
    status,
    message: presentationText(message),
    ...(code !== undefined ? { code } : {}),
    ...(label !== undefined ? { label: presentationText(label) } : {}),
    ...(title !== undefined ? { title: presentationText(title) } : {}),
    ...(detail !== undefined ? { detail: presentationText(detail) } : {}),
    ...(instance !== undefined ? { instance: presentationText(instance) } : {}),
    ...(type !== undefined ? { type: presentationText(type) } : {}),
    ...(violations !== undefined ? { violations: redactRecord(violations) } : {}),
  };
  return problem;
}

function problemFamily(value: Record<string, unknown> | undefined): NormalizedProblemFamily {
  if (!value) return "unknown";
  if (hasAny(value, "detail", "title", "type", "instance")) return "rfc7807";
  if (hasAny(value, "errorCode", "errorLabel", "violations")) return "validation";
  if (hasAny(value, "message", "error")) return "legacy";
  return "unknown";
}

function readErrorCode(body: unknown): string | number | undefined {
  if (!body || typeof body !== "object") return undefined;

  const value = body as {
    code?: unknown;
    errorCode?: unknown;
    error?: {
      code?: unknown;
    };
  };

  if (typeof value.errorCode === "string" || typeof value.errorCode === "number") return value.errorCode;
  if (typeof value.error?.code === "string" || typeof value.error?.code === "number") return value.error.code;
  if (typeof value.code === "string" || typeof value.code === "number") return value.code;

  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function hasAny(value: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function presentationText(value: string): string {
  const safe = redact(value);
  return safe.length <= MAX_PRESENTATION_MESSAGE_LENGTH
    ? safe
    : `${safe.slice(0, MAX_PRESENTATION_MESSAGE_LENGTH - 1)}…`;
}
