export class PlakyApiError extends Error {
  override readonly name: string = "PlakyApiError";
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
    readonly body?: unknown,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export class PlakyValidationError extends PlakyApiError {
  override readonly name = "PlakyValidationError";
}
export class PlakyNotFoundError extends PlakyApiError {
  override readonly name = "PlakyNotFoundError";
}
export class PlakyRateLimitError extends PlakyApiError {
  override readonly name = "PlakyRateLimitError";
}
export class PlakyAuthError extends PlakyApiError {
  override readonly name = "PlakyAuthError";
}

export class PlakyAmbiguousMatchError extends Error {
  override readonly name = "PlakyAmbiguousMatchError";
  constructor(message: string, readonly candidates: unknown[]) {
    super(message);
  }
}

export function classify(
  status: number,
  message: string,
  requestId: string | undefined,
  body: unknown,
  retryAfterMs: number | undefined,
): PlakyApiError {
  if (status === 401 || status === 403) return new PlakyAuthError(message, status, requestId, body);
  if (status === 404) return new PlakyNotFoundError(message, status, requestId, body);
  if (status === 422 || status === 400) return new PlakyValidationError(message, status, requestId, body);
  if (status === 429) return new PlakyRateLimitError(message, status, requestId, body, retryAfterMs);
  return new PlakyApiError(message, status, requestId, body);
}
