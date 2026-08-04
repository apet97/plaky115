import { runBoundedCommand, sanitizedEnvironment } from "./verification-runner.mjs";

export const REGISTRY_LIMITS = Object.freeze({
  requestTimeoutMs: 10_000,
  manifestBytes: 2 * 1024 * 1024,
  attestationBytes: 8 * 1024 * 1024,
  retryDeadlineMs: 120_000,
});

export class RegistryRequestError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "RegistryRequestError";
    Object.assign(this, details);
  }
}

export async function fetchJsonBounded(url, options = {}) {
  const {
    maxBytes = REGISTRY_LIMITS.manifestBytes,
    timeoutMs = REGISTRY_LIMITS.requestTimeoutMs,
    signal,
    fetchImpl = globalThis.fetch,
    allowedOrigin,
  } = options;
  const parsed = validateHttpsURL(url, allowedOrigin);
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason ?? new Error("registry request aborted"));
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error("registry request timed out")), timeoutMs);
  timer.unref?.();
  try {
    let response;
    try {
      response = await fetchImpl(parsed.href, { redirect: "error", signal: controller.signal });
    } catch (error) {
      throw new RegistryRequestError("registry request failed", { reason: controller.signal.aborted ? "timeout-or-abort" : "network", cause: error });
    }
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!/^(?:application\/json|application\/[^;]+\+json)(?:\s*;|$)/i.test(contentType)) {
      throw new RegistryRequestError("registry response is not JSON", { status: response.status, contentType });
    }
    const declaredLength = Number(response.headers?.get?.("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new RegistryRequestError("registry response exceeds the size limit", { status: response.status, bytes: declaredLength, limit: maxBytes });
    }
    const bytes = await readBoundedBody(response, maxBytes);
    if (!response.ok) throw new RegistryRequestError(`registry request failed with HTTP ${response.status}`, { status: response.status, bodyBytes: bytes.byteLength });
    try {
      return JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      throw new RegistryRequestError("registry response is not valid JSON", { status: response.status, cause: error });
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export async function readRegistryPackage(packageName, version, options = {}) {
  const encoded = packageName.startsWith("@") ? packageName.replaceAll("/", "%2f") : packageName;
  const url = `https://registry.npmjs.org/${encoded}/${encodeURIComponent(version)}`;
  try {
    const manifest = await fetchJsonBounded(url, {
      ...options,
      maxBytes: options.maxBytes ?? REGISTRY_LIMITS.manifestBytes,
      allowedOrigin: "https://registry.npmjs.org",
    });
    return { state: "present", manifest };
  } catch (error) {
    if (error instanceof RegistryRequestError && error.status === 404) return { state: "absent" };
    if (error instanceof RegistryRequestError && error.reason === "network") return { state: "ambiguous", error: summarizeNetworkError(error) };
    throw error;
  }
}

export async function retryRegistryRead(read, options = {}) {
  const deadlineMs = options.deadlineMs ?? REGISTRY_LIMITS.retryDeadlineMs;
  const delayMs = options.delayMs ?? 1_000;
  const started = Date.now();
  let lastError;
  while (Date.now() - started <= deadlineMs) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      if (!options.isTransient?.(error)) throw error;
      const remaining = deadlineMs - (Date.now() - started);
      if (remaining <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, remaining)));
    }
  }
  throw new RegistryRequestError("registry consistency deadline expired", { reason: "retry-deadline", cause: lastError });
}

export async function runReleaseSubprocess(command, args, options = {}) {
  return runBoundedCommand(command, args, {
    cwd: options.cwd,
    env: { ...sanitizedEnvironment(), ...(options.env ?? {}) },
    timeoutMs: options.timeoutMs ?? 120_000,
    maxOutputBytes: options.maxOutputBytes ?? 64 * 1024,
    signal: options.signal,
    label: options.label,
  });
}

function validateHttpsURL(value, allowedOrigin) {
  let parsed;
  try { parsed = new URL(value); } catch (error) { throw new RegistryRequestError("registry URL is invalid", { cause: error }); }
  if (parsed.protocol !== "https:") throw new RegistryRequestError("registry URL must use HTTPS");
  if (allowedOrigin !== undefined && parsed.origin !== allowedOrigin) throw new RegistryRequestError("registry URL has an untrusted origin");
  return parsed;
}

async function readBoundedBody(response, maxBytes) {
  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new RegistryRequestError("registry response exceeds the size limit", { bytes: bytes.byteLength, limit: maxBytes });
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RegistryRequestError("registry response exceeds the size limit", { bytes: total, limit: maxBytes });
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock?.();
  }
  return Buffer.concat(chunks, total);
}

function summarizeNetworkError(error) {
  return { name: error.name, message: String(error.message).slice(0, 200) };
}
