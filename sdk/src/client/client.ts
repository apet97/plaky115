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
import { SpacesResource } from "./spaces.js";
import { BoardsResource } from "./boards.js";
import { ItemsResource } from "./items.js";
import { ItemCommentsResource } from "./item-comments.js";
import { ReactionsResource } from "./reactions.js";
import { UsersResource } from "./users.js";
import { TeamsResource } from "./teams.js";

export type PlakyClientOptions = {
  apiKey: ApiKeyProvider;
  serverURL?: string | undefined;
  timeoutMs?: number | undefined;
  maxRetries?: number | undefined;
  headers?: HeaderProvider | undefined;
  fetch?: FetchLike | undefined;
  interceptors?: Interceptors | undefined;
  userAgent?: string | undefined;
};

export const DEFAULT_SERVER_URL = "https://api.plaky.com";

type Resolved = {
  apiKey: ApiKeyProvider;
  serverURL: string;
  timeoutMs: number;
  maxRetries: number;
  headers?: HeaderProvider | undefined;
  fetch?: FetchLike | undefined;
  interceptors?: Interceptors | undefined;
  userAgent?: string | undefined;
};

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

  constructor(opts: PlakyClientOptions) {
    if (typeof opts.apiKey === "string" && !opts.apiKey) throw new Error("PlakyClient: apiKey is required");
    const resolved: Resolved = {
      apiKey: opts.apiKey,
      serverURL: opts.serverURL ?? DEFAULT_SERVER_URL,
      timeoutMs: opts.timeoutMs ?? 30_000,
      maxRetries: opts.maxRetries ?? 2,
    };
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
  }

  withOptions(overrides: Partial<PlakyClientOptions>): PlakyClient {
    const headers = mergeHeaderProviders(this.options.headers, overrides.headers);
    return new PlakyClient({
      apiKey: overrides.apiKey ?? this.options.apiKey,
      serverURL: overrides.serverURL ?? this.options.serverURL,
      timeoutMs: overrides.timeoutMs ?? this.options.timeoutMs,
      maxRetries: overrides.maxRetries ?? this.options.maxRetries,
      ...(headers !== undefined ? { headers } : {}),
      ...(overrides.fetch !== undefined ? { fetch: overrides.fetch } : this.options.fetch !== undefined ? { fetch: this.options.fetch } : {}),
      ...(overrides.interceptors !== undefined ? { interceptors: overrides.interceptors } : this.options.interceptors !== undefined ? { interceptors: this.options.interceptors } : {}),
      ...(overrides.userAgent !== undefined ? { userAgent: overrides.userAgent } : this.options.userAgent !== undefined ? { userAgent: this.options.userAgent } : {}),
    });
  }

  request<T>(req: RawRequest, options?: PlakyRequestOverrides): Promise<T> {
    return runtimeRequest<T>(req, this.requestOptions(options));
  }

  requestWithResponse<T>(req: RawRequest, options?: PlakyRequestOverrides): Promise<PlakyApiResponse<T>> {
    return runtimeRequestWithResponse<T>(req, this.requestOptions(options));
  }

  requestOptions(extra?: PlakyRequestOverrides): PlakyRequestOptions {
    const base: PlakyRequestOptions = {
      apiKey: this.options.apiKey,
      serverURL: this.options.serverURL,
      timeoutMs: this.options.timeoutMs,
      maxRetries: this.options.maxRetries,
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
