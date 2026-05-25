export class PlakyError extends Error {
  override readonly name: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = new.target.name;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class PlakyConnectionError extends PlakyError {}

export class PlakyTimeoutError extends PlakyError {
  constructor(message = "Request timed out.", options?: { cause?: unknown }) {
    super(message, options);
  }
}

export class PlakyAbortError extends PlakyError {
  constructor(message = "Request was aborted.", options?: { cause?: unknown }) {
    super(message, options);
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

export class PlakyAuthError extends PlakyApiError {}
export class PlakyPermissionError extends PlakyApiError {}
export class PlakyNotFoundError extends PlakyApiError {}
export class PlakyConflictError extends PlakyApiError {}
export class PlakyValidationError extends PlakyApiError {}
export class PlakyUnprocessableEntityError extends PlakyApiError {}
export class PlakyRateLimitError extends PlakyApiError {}
export class PlakyServerError extends PlakyApiError {}

export class PlakyAmbiguousMatchError extends PlakyError {
  constructor(message: string, readonly candidates: unknown[]) {
    super(message);
  }
}

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
