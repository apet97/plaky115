import { RateLimitSink } from "../runtime/rate-limit.js";
import type { Interceptors } from "../runtime/interceptors.js";
import type { PlakyRequestOptions } from "../runtime/http.js";
import { SpacesResource } from "./spaces.js";
import { BoardsResource } from "./boards.js";
import { ItemsResource } from "./items.js";
import { ItemCommentsResource } from "./item-comments.js";
import { ReactionsResource } from "./reactions.js";
import { UsersResource } from "./users.js";
import { TeamsResource } from "./teams.js";

export type PlakyClientOptions = {
  apiKey: string;
  serverURL?: string;
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  interceptors?: Interceptors;
  userAgent?: string;
};

export const DEFAULT_SERVER_URL = "https://api.plaky.com";

type Resolved = Required<Pick<PlakyClientOptions, "apiKey" | "serverURL" | "timeoutMs" | "maxRetries">> &
  Pick<PlakyClientOptions, "headers" | "interceptors" | "userAgent">;

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
    if (!opts.apiKey) throw new Error("PlakyClient: apiKey is required");
    const resolved: Resolved = {
      apiKey: opts.apiKey,
      serverURL: opts.serverURL ?? DEFAULT_SERVER_URL,
      timeoutMs: opts.timeoutMs ?? 30_000,
      maxRetries: opts.maxRetries ?? 2,
    };
    if (opts.headers !== undefined) resolved.headers = opts.headers;
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
    return new PlakyClient({
      apiKey: overrides.apiKey ?? this.options.apiKey,
      serverURL: overrides.serverURL ?? this.options.serverURL,
      timeoutMs: overrides.timeoutMs ?? this.options.timeoutMs,
      maxRetries: overrides.maxRetries ?? this.options.maxRetries,
      ...(overrides.headers !== undefined ? { headers: overrides.headers } : this.options.headers !== undefined ? { headers: this.options.headers } : {}),
      ...(overrides.interceptors !== undefined ? { interceptors: overrides.interceptors } : this.options.interceptors !== undefined ? { interceptors: this.options.interceptors } : {}),
      ...(overrides.userAgent !== undefined ? { userAgent: overrides.userAgent } : this.options.userAgent !== undefined ? { userAgent: this.options.userAgent } : {}),
    });
  }

  requestOptions(extra?: Partial<PlakyRequestOptions>): PlakyRequestOptions {
    const base: PlakyRequestOptions = {
      apiKey: this.options.apiKey,
      serverURL: this.options.serverURL,
      timeoutMs: this.options.timeoutMs,
      maxRetries: this.options.maxRetries,
      rateLimitSink: this.rateLimit,
    };
    if (this.options.headers !== undefined) base.headers = this.options.headers;
    if (this.options.interceptors !== undefined) base.interceptors = this.options.interceptors;
    if (this.options.userAgent !== undefined) base.userAgent = this.options.userAgent;
    if (extra) Object.assign(base, extra);
    return base;
  }
}
