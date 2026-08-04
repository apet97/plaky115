import type { PlakyClient } from "./client.js";
import { assertPagedResult, paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { StrictPagedResult, UserShape } from "./shapes.js";

export type UserStatus = "ACTIVE" | "PENDING" | "INACTIVE";
export type UserType = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type UserListParams = {
  emails?: readonly string[] | undefined;
  status?: UserStatus | undefined;
  type?: UserType | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type UserIteratorParams = Omit<UserListParams, "page"> & {
  limit?: number | undefined;
};

/** Users resource. Access via `client.users`. */
export class UsersResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * List a page of workspace users, optionally filtered by emails, status, or type.
   *
   * @param query - Optional `emails`, `status`, `type`, `page`, `pageSize`.
   * @param options - Per-request overrides.
   * @returns A page of users with `data` and `hasMore`.
   */
  async list(query?: UserListParams, options?: ResourceRequestOverrides): Promise<StrictPagedResult<UserShape>> {
    const response = await this.client.request<unknown>(
      {
        method: "GET",
        path: "/v1/public/users",
        query,
        operationId: "listUsers",
      },
      options,
    );
    return assertPagedResult<UserShape>(response, "listUsers");
  }

  /**
   * Fetch the user that owns the current API key. Useful as a connectivity and
   * auth check.
   *
   * @param options - Per-request overrides.
   * @returns The current user.
   * @throws {import("../runtime/errors.js").PlakyAuthError} If the key is invalid.
   */
  me(options?: ResourceRequestOverrides): Promise<UserShape> {
    return this.client.request<UserShape>(
      {
        method: "GET",
        path: "/v1/public/users/me",
        operationId: "getCurrentUser",
      },
      options,
    );
  }

  /**
   * Lazily iterate users across pages. `limit` is a client-side cap.
   *
   * @param opts - Filters plus `pageSize` and optional client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(opts: UserIteratorParams = {}, options?: ResourceRequestOverrides): PaginatedIterator<UserShape> {
    const { limit, pageSize, ...query } = opts;
    return paginate<UserShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...query, page, pageSize }, options);
        return { data: res.data, hasMore: res.hasMore, raw: res };
      },
      { pageSize, limit },
    );
  }

  /**
   * Collect all matching users into an array, walking every page.
   *
   * @param opts - Filters plus `pageSize` and optional client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns Every matching user.
   */
  async listAll(opts: UserIteratorParams = {}, options?: ResourceRequestOverrides): Promise<UserShape[]> {
    const out: UserShape[] = [];
    for await (const u of this.iterate(opts, options)) out.push(u);
    return out;
  }
}
