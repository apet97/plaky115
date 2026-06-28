import { buildUserAgent } from "../user-agent.js";
import type { PlakyRequestOptions, RawRequest } from "../http.js";
import type { HeaderProvider, QueryParams } from "../types.js";

export async function buildHeaders(req: RawRequest, opts: PlakyRequestOptions): Promise<Headers> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  headers.set("User-Agent", opts.userAgent ?? buildUserAgent());

  const apiKey = await resolveApiKey(opts.apiKey);
  headers.set("X-API-Key", apiKey);

  mergeHeadersInto(headers, await resolveHeaders(opts.headers));

  if (req.body !== undefined) {
    setContentTypeIfNeeded(req.body, headers);
  }

  if (opts.idempotencyKey && !headers.has("Idempotency-Key")) {
    headers.set("Idempotency-Key", opts.idempotencyKey);
  }

  return headers;
}

// Query parameters the Plaky spec declares with `explode: false`: their array
// values must be serialized as one comma-joined value (`?expand=a,b`) rather
// than repeated keys (`?expand=a&expand=b`). The live API accepts both forms,
// but comma-join is the spec-aligned serialization. All other array params keep
// the default `explode: true` (repeated-key) behavior.
const EXPLODE_FALSE_PARAMS = new Set<string>(["expand"]);

export function buildUrl(server: string, path: string, query?: QueryParams): string {
  const base = server.endsWith("/") ? server : `${server}/`;
  const url = new URL(path.replace(/^\//, ""), base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;

      if (isQueryArray(value)) {
        if (value.length === 0) continue;
        if (EXPLODE_FALSE_PARAMS.has(key)) {
          url.searchParams.set(key, value.map(formatQueryValue).join(","));
        } else {
          for (const item of value) url.searchParams.append(key, formatQueryValue(item));
        }
      } else {
        url.searchParams.set(key, formatQueryValue(value));
      }
    }
  }

  return url.toString();
}

export async function resolveHeaders(headers: HeaderProvider | undefined): Promise<HeadersInit | undefined> {
  if (!headers) return undefined;
  return typeof headers === "function" ? headers() : headers;
}

export function mergeHeadersInto(target: Headers, source?: HeadersInit): void {
  if (!source) return;

  new Headers(source).forEach((value, key) => {
    if (value === "") target.delete(key);
    else target.set(key, value);
  });
}

export function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isBodyInit(body)) return body;

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

async function resolveApiKey(apiKey: PlakyRequestOptions["apiKey"]): Promise<string> {
  return typeof apiKey === "function" ? apiKey() : apiKey;
}

function setContentTypeIfNeeded(body: unknown, headers: Headers): void {
  if (!isBodyInit(body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
}

function formatQueryValue(value: string | number | boolean | Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isQueryArray(value: QueryParams[string]): value is readonly (string | number | boolean | Date)[] {
  return Array.isArray(value);
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof ReadableStream !== "undefined" && value instanceof ReadableStream)
  );
}
