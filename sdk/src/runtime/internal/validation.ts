import type { PlakyRequestOptions } from "../http.js";

export const DEFAULT_MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
export const MAX_TIMEOUT_MS = 2_147_483_647;
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;

export function validateTimeout(value: number, name = "timeoutMs"): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`PlakyClient: ${name} must be a non-negative number`);
  if (value > MAX_TIMEOUT_MS) throw new Error(`PlakyClient: ${name} must be a non-negative number no greater than ${MAX_TIMEOUT_MS} milliseconds`);
}

export function validateRetries(value: number, name = "maxRetries"): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`PlakyClient: ${name} must be a non-negative number`);
  if (!Number.isInteger(value)) {
    throw new Error(`PlakyClient: ${name} must be a non-negative integer`);
  }
}

export function validateResponseLimit(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_RESPONSE_BYTES) {
    throw new Error(`PlakyClient: maxResponseBytes must be an integer between 1 and ${MAX_RESPONSE_BYTES}`);
  }
}

export function normalizeServerURL(serverURL: string): string {
  const invalid = "PlakyClient: serverURL must be an absolute HTTPS URL (or loopback HTTP) with a host";
  if (serverURL.trim() !== serverURL || !/^https?:\/\/[^/]/i.test(serverURL)) throw new Error(invalid);

  let url: URL;
  try {
    url = new URL(serverURL);
  } catch {
    throw new Error(invalid);
  }
  if (!url.host || (url.protocol !== "https:" && (url.protocol !== "http:" || !isLoopback(url.hostname)))) {
    throw new Error(invalid);
  }
  if (url.username || url.password) throw new Error("PlakyClient: serverURL must not include credentials");
  if (url.search || url.hash) throw new Error("PlakyClient: serverURL must not include a query or fragment");

  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function validateRequestOptions(opts: PlakyRequestOptions): {
  serverURL: string;
  timeoutMs: number;
  maxRetries: number;
  maxResponseBytes: number;
} {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const maxRetries = opts.maxRetries ?? 0;
  const maxResponseBytes = opts.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  validateTimeout(timeoutMs);
  validateRetries(maxRetries);
  validateResponseLimit(maxResponseBytes);
  return { serverURL: normalizeServerURL(opts.serverURL), timeoutMs, maxRetries, maxResponseBytes };
}

export function assertTrustedRequestURL(serverURL: string, requestURL: string): void {
  let target: URL;
  try {
    target = new URL(requestURL);
  } catch {
    throw new Error("PlakyClient: request interceptor returned an invalid URL");
  }
  if (target.origin !== new URL(serverURL).origin) {
    throw new Error("PlakyClient: request interceptor must not change the trusted server origin");
  }
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  const octets = host.split(".");
  return octets.length === 4
    && octets[0] === "127"
    && octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
