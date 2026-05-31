import { PlakyAbortError, PlakyConnectionError, PlakyError, PlakyTimeoutError } from "../errors.js";
import type { FetchLike } from "../types.js";

export function getFetch(fetchFn: FetchLike | undefined): FetchLike {
  const resolved = fetchFn ?? globalThis.fetch;
  if (!resolved) throw new Error("No fetch implementation found. Pass `fetch` to PlakyClient.");
  return resolved.bind(globalThis);
}

export async function doFetch(fetchFn: FetchLike, url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
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
