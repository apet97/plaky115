import type { ResponseType } from "../types.js";
import { PlakyResponseTooLargeError } from "../errors.js";
import { DEFAULT_MAX_RESPONSE_BYTES } from "./validation.js";

export async function parseResponse<T>(response: Response, responseType: ResponseType, limit = DEFAULT_MAX_RESPONSE_BYTES): Promise<T> {
  if (responseType === "void" || response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  if (responseType === "stream") return response.body as T;
  const bytes = await readBounded(response, limit);
  if (responseType === "bytes") return bytes as T;
  const text = new TextDecoder().decode(bytes);
  if (responseType === "text") return text as T;

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function parseErrorBody(response: Response, limit = DEFAULT_MAX_RESPONSE_BYTES): Promise<unknown> {
  const text = new TextDecoder().decode(await readBounded(response, limit));
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function readBounded(response: Response, limit: number): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > limit) {
    await response.body?.cancel();
    throw new PlakyResponseTooLargeError(limit);
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new PlakyResponseTooLargeError(limit);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function getRequestId(headers: Headers): string | undefined {
  return headers.get("x-request-id") ?? headers.get("request-id") ?? headers.get("x-correlation-id") ?? undefined;
}
