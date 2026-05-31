import type { ResponseType } from "../types.js";

export async function parseResponse<T>(response: Response, responseType: ResponseType): Promise<T> {
  if (responseType === "void" || response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  if (responseType === "stream") return response.body as T;
  if (responseType === "bytes") return new Uint8Array(await response.arrayBuffer()) as T;
  if (responseType === "text") return response.text() as Promise<T>;

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function parseErrorBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getRequestId(headers: Headers): string | undefined {
  return headers.get("x-request-id") ?? headers.get("request-id") ?? headers.get("x-correlation-id") ?? undefined;
}
