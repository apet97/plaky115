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

export class UsersResource {
  constructor(private readonly client: PlakyClient) {}

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

  async listAll(opts: UserIteratorParams = {}): Promise<ShortUserShape[]> {
    const out: ShortUserShape[] = [];
    for await (const u of this.iterate(opts)) out.push(u);
    return out;
  }
}
