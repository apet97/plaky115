import { RateLimitSink } from "../runtime/rate-limit.js";
import type { Interceptors } from "../runtime/interceptors.js";
import { request as runtimeRequest, requestWithResponse as runtimeRequestWithResponse, resolveHeaders, mergeHeadersInto } from "../runtime/http.js";
import type { PlakyRequestOptions, RawRequest } from "../runtime/http.js";
import type {
  ApiKeyProvider,
  FetchLike,
  HeaderProvider,
  PlakyApiResponse,
  PlakyRequestOverrides,
} from "../runtime/types.js";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  normalizeServerURL,
  validateResponseLimit,
  validateRetries,
  validateTimeout,
} from "../runtime/internal/validation.js";
import { SpacesResource } from "./spaces.js";
import { BoardsResource } from "./boards.js";
import { ItemsResource } from "./items.js";
import { ItemCommentsResource } from "./item-comments.js";
import { ReactionsResource } from "./reactions.js";
import { UsersResource } from "./users.js";
import { TeamsResource } from "./teams.js";
import { ItemGroupsResource } from "./item-groups.js";
import { ItemFilesResource } from "./item-files.js";

/**
 * Constructor options for {@link PlakyClient}.
 *
 * @property apiKey - API key string, or a sync/async provider resolved per
 *   request. Sent as the `X-API-Key` header.
 * @property serverURL - Base URL. Defaults to {@link DEFAULT_SERVER_URL}. Plaky
 *   workspaces are account-prefixed (for example `https://acme.api.plaky.com`);
 *   set this to your account host when the generic host does not route. See
 *   `docs/api-behavior.md`.
 * @property timeoutMs - Per-request timeout in milliseconds. Defaults to `30000`.
 * @property maxRetries - Maximum automatic retries. Defaults to `2`. Only
 *   `GET` requests are retried automatically.
 * @property headers - Static or async extra headers merged into every request.
 * @property fetch - Custom `fetch` implementation for tests or edge runtimes.
 * @property interceptors - Request/response interceptors.
 * @property userAgent - Value appended to the default `User-Agent`.
 */
export type PlakyClientOptions = {
  apiKey: ApiKeyProvider;
  serverURL?: string | undefined;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  maxResponseBytes?: number | undefined;
  headers?: HeaderProvider | undefined;
  fetch?: FetchLike | undefined;
  interceptors?: Interceptors | undefined;
  userAgent?: string | undefined;
};

/**
 * Default base URL. Note: real Plaky workspaces are account-prefixed
 * (`https://<account>.api.plaky.com`); pass `serverURL` when the generic host
 * does not route for your workspace. See `docs/api-behavior.md`.
 */
export const DEFAULT_SERVER_URL = "https://api.plaky.com";

type Resolved = {
  apiKey: ApiKeyProvider;
  serverURL: string;
  timeoutMs: number;
  maxRetries: number;
  maxResponseBytes: number;
  headers?: HeaderProvider | undefined;
  fetch?: FetchLike | undefined;
  interceptors?: Interceptors | undefined;
  userAgent?: string | undefined;
};

/**
 * Entry point for the Plaky SDK. Groups the hand-written resource clients
 * (`spaces`, `boards`, `items`, `comments`, `reactions`, `users`, `teams`) and
 * owns shared transport behavior: auth, retries, idempotency, timeouts,
 * cancellation, typed errors, rate-limit accounting, and interceptors.
 *
 * @example
 * ```ts
 * import { PlakyClient } from "plaky115";
 *
 * const client = new PlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });
 * const spaces = await client.spaces.list();
 * ```
 */
export class PlakyClient {
  readonly options: Resolved;
  readonly rateLimit = new RateLimitSink();
  readonly spaces: SpacesResource;
  readonly boards: BoardsResource;
  readonly items: ItemsResource;
  readonly comments: ItemCommentsResource;
  readonly reactions: ReactionsResource;
  readonly users: UsersResource;
  readonly teams: TeamsResource;
  readonly itemGroups: ItemGroupsResource;
  readonly itemFiles: ItemFilesResource;

  /**
   * @param opts - See {@link PlakyClientOptions}.
   * @throws {Error} If a literal `apiKey` is blank, `serverURL` is unsafe or
   *   malformed, `timeoutMs` is not between 0 and 2,147,483,647 milliseconds, or
   *   `maxRetries` is not a finite non-negative integer. `maxRetries: 0` and
   *   a timeout above the platform timer limit is rejected.
   */
  constructor(opts: PlakyClientOptions) {
    if (typeof opts.apiKey === "string") assertApiKey(opts.apiKey);
    const resolved: Resolved = {
      apiKey: opts.apiKey,
      serverURL: normalizeServerURL(opts.serverURL ?? DEFAULT_SERVER_URL),
      timeoutMs: opts.timeoutMs ?? 30_000,
      maxRetries: opts.maxRetries ?? 2,
      maxResponseBytes: opts.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    };
    validateTimeout(resolved.timeoutMs);
    validateRetries(resolved.maxRetries);
    validateResponseLimit(resolved.maxResponseBytes);
    if (opts.headers !== undefined) resolved.headers = opts.headers;
    if (opts.fetch !== undefined) resolved.fetch = opts.fetch;
    if (opts.interceptors !== undefined) resolved.interceptors = opts.interceptors;
    if (opts.userAgent !== undefined) resolved.userAgent = opts.userAgent;
    this.options = resolved;
    this.spaces = new SpacesResource(this);
    this.boards = new BoardsResource(this);
    this.items = new ItemsResource(this);
    this.comments = new ItemCommentsResource(this);
    this.reactions = new ReactionsResource(this);
    this.users = new UsersResource(this);
    this.teams = new TeamsResource(this);
    this.itemGroups = new ItemGroupsResource(this);
    this.itemFiles = new ItemFilesResource(this);
  }

  /**
   * Return a new client with the given options overridden. Header providers are
   * merged (existing then override); the original client is left unchanged.
   *
   * @param overrides - Subset of {@link PlakyClientOptions} to override.
   * @returns A new {@link PlakyClient}.
   */
  withOptions(overrides: Partial<PlakyClientOptions>): PlakyClient {
    const headers = mergeHeaderProviders(this.options.headers, overrides.headers);
    return new PlakyClient({
      apiKey: overrides.apiKey ?? this.options.apiKey,
      serverURL: overrides.serverURL ?? this.options.serverURL,
      timeoutMs: overrides.timeoutMs ?? this.options.timeoutMs,
      maxRetries: overrides.maxRetries ?? this.options.maxRetries,
      maxResponseBytes: overrides.maxResponseBytes ?? this.options.maxResponseBytes,
      ...(headers !== undefined ? { headers } : {}),
      ...(overrides.fetch !== undefined ? { fetch: overrides.fetch } : this.options.fetch !== undefined ? { fetch: this.options.fetch } : {}),
      ...(overrides.interceptors !== undefined ? { interceptors: overrides.interceptors } : this.options.interceptors !== undefined ? { interceptors: this.options.interceptors } : {}),
      ...(overrides.userAgent !== undefined ? { userAgent: overrides.userAgent } : this.options.userAgent !== undefined ? { userAgent: this.options.userAgent } : {}),
    });
  }

  /**
   * Low-level request escape hatch that returns the parsed response body. Uses
   * the same transport as resource methods (auth, retries, timeout, abort,
   * typed errors). Prefer a resource method when one exists.
   *
   * @typeParam T - Expected parsed body type.
   * @param req - Method, path, optional query/body, and operation metadata.
   * @param options - Per-request overrides (headers, signal, timeout, idempotency).
   * @returns The parsed response body.
   * @throws {import("../runtime/errors.js").PlakyApiError} On non-2xx responses.
   * @throws {import("../runtime/errors.js").PlakyTimeoutError} On timeout.
   */
  request<T>(req: RawRequest, options?: PlakyRequestOverrides): Promise<T> {
    return runtimeRequest<T>(req, this.requestOptions(options));
  }

  /**
   * Like {@link PlakyClient.request} but resolves to the full response envelope
   * (status, headers, request ID, and parsed `data`).
   *
   * @typeParam T - Expected parsed body type.
   * @param req - Method, path, optional query/body, and operation metadata.
   * @param options - Per-request overrides.
   * @returns The response envelope including `status`, `requestId`, and `data`.
   * @throws {import("../runtime/errors.js").PlakyApiError} On non-2xx responses.
   */
  requestWithResponse<T>(req: RawRequest, options?: PlakyRequestOverrides): Promise<PlakyApiResponse<T>> {
    return runtimeRequestWithResponse<T>(req, this.requestOptions(options));
  }

  requestOptions(extra?: PlakyRequestOverrides): PlakyRequestOptions {
    const base: PlakyRequestOptions = {
      apiKey: this.options.apiKey,
      serverURL: this.options.serverURL,
      timeoutMs: this.options.timeoutMs,
      maxRetries: this.options.maxRetries,
      maxResponseBytes: this.options.maxResponseBytes,
      rateLimitSink: this.rateLimit,
    };
    const headers = mergeHeaderProviders(this.options.headers, extra?.headers);
    if (headers !== undefined) base.headers = headers;
    if (this.options.fetch !== undefined) base.fetch = this.options.fetch;
    if (this.options.interceptors !== undefined) base.interceptors = this.options.interceptors;
    if (this.options.userAgent !== undefined) base.userAgent = this.options.userAgent;
    if (extra) Object.assign(base, extra);
    if (headers !== undefined) base.headers = headers;
    return base;
  }
}

function assertApiKey(apiKey: string): void {
  if (apiKey.trim() === "") {
    throw new Error("PlakyClient: apiKey is required");
  }
}

function mergeHeaderProviders(left: HeaderProvider | undefined, right: HeaderProvider | undefined): HeaderProvider | undefined {
  if (!left) return right;
  if (!right) return left;

  return async () => {
    const headers = new Headers();
    mergeHeadersInto(headers, await resolveHeaders(left));
    mergeHeadersInto(headers, await resolveHeaders(right));
    return headers;
  };
}
