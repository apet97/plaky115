import type { PlakyClient } from "./client.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { PagedResult, UserShape, ShortUserShape } from "./shapes.js";

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
  list(query?: UserListParams, options?: PlakyRequestOverrides): Promise<PagedResult<ShortUserShape>> {
    return this.client.request<PagedResult<ShortUserShape>>(
      {
        method: "GET",
        path: "/v1/public/users",
        query,
        operationId: "listUsers",
      },
      options,
    );
  }

  /**
   * Fetch the user that owns the current API key. Useful as a connectivity and
   * auth check.
   *
   * @param options - Per-request overrides.
   * @returns The current user.
   * @throws {import("../runtime/errors.js").PlakyAuthError} If the key is invalid.
   */
  me(options?: PlakyRequestOverrides): Promise<UserShape> {
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
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(opts: UserIteratorParams = {}): PaginatedIterator<ShortUserShape> {
    const { limit, pageSize, ...query } = opts;
    return paginate<ShortUserShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...query, page, pageSize });
        return { data: (res.data ?? []) as ShortUserShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize, limit },
    );
  }

  /**
   * Collect all matching users into an array, walking every page.
   *
   * @param opts - Filters plus `pageSize` and optional client-side `limit`.
   * @returns Every matching user.
   */
  async listAll(opts: UserIteratorParams = {}): Promise<ShortUserShape[]> {
    const out: ShortUserShape[] = [];
    for await (const u of this.iterate(opts)) out.push(u);
    return out;
  }
}
