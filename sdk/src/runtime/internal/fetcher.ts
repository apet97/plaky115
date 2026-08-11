import { PlakyAbortError, PlakyConnectionError, PlakyError, PlakyTimeoutError } from "../errors.js";
import type { FetchLike } from "../types.js";

export type AttemptDeadline = {
  readonly signal: AbortSignal;
  readonly cause: () => "abort" | "timeout" | undefined;
  dispose(): void;
};

export function getFetch(fetchFn: FetchLike | undefined): FetchLike {
  const resolved = fetchFn ?? globalThis.fetch;
  if (!resolved) throw new Error("No fetch implementation found. Pass `fetch` to PlakyClient.");
  return resolved.bind(globalThis);
}

export function createAttemptDeadline(userSignal: AbortSignal | undefined, timeoutMs: number): AttemptDeadline {
  const controller = new AbortController();
  let reason: "abort" | "timeout" | undefined;
  let disposed = false;

  const onAbort = () => {
    if (reason === undefined) reason = "abort";
    controller.abort(userSignal?.reason);
  };
  if (userSignal?.aborted) onAbort();
  else userSignal?.addEventListener("abort", onAbort, { once: true });

  const timer = timeoutMs > 0
    ? setTimeout(() => {
        if (reason === undefined) reason = "timeout";
        controller.abort();
      }, timeoutMs)
    : undefined;

  return {
    signal: controller.signal,
    cause: () => reason,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      userSignal?.removeEventListener("abort", onAbort);
    },
  };
}

export function attemptError(deadline: AttemptDeadline, error: unknown): PlakyError {
  if (deadline.cause() === "abort") return new PlakyAbortError("Request was aborted.", { cause: error });
  if (deadline.cause() === "timeout") return new PlakyTimeoutError("Request timed out.", { cause: error });
  if (error instanceof PlakyError) return error;
  return new PlakyConnectionError("Connection error while communicating with the Plaky API.", { cause: error });
}

export async function withAttemptDeadline<T>(deadline: AttemptDeadline, operation: PromiseLike<T>): Promise<T> {
  if (deadline.signal.aborted) {
    // The promise is already created by the caller. Attach a rejection handler
    // before returning so an abort cannot turn a late fetch rejection into an
    // unhandled rejection.
    void Promise.resolve(operation).catch(() => undefined);
    throw attemptError(deadline, new DOMException("The operation was aborted.", "AbortError"));
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      deadline.signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(attemptError(deadline, new DOMException("The operation was aborted.", "AbortError")));
    };
    deadline.signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(operation).then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(deadline.cause() === undefined ? error : attemptError(deadline, error));
      },
    );
  });
}

export async function doFetch(
  fetchFn: FetchLike,
  url: string,
  init: RequestInit,
  timeoutOrDeadline: number | AttemptDeadline,
): Promise<Response> {
  const ownedDeadline = typeof timeoutOrDeadline === "number";
  const deadline = ownedDeadline
    ? createAttemptDeadline(init.signal as AbortSignal | undefined, timeoutOrDeadline)
    : timeoutOrDeadline;
  try {
    return await withAttemptDeadline(deadline, Promise.resolve().then(() => fetchFn(url, { ...init, signal: deadline.signal })));
  } catch (error) {
    throw attemptError(deadline, error);
  } finally {
    if (ownedDeadline) deadline.dispose();
  }
}
