import type { PlakyClient } from "./client.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { PagedResult, UserShape, ShortUserShape } from "./shapes.js";

export class UsersResource {
  constructor(private readonly client: PlakyClient) {}

  list(query?: { page?: number; pageSize?: number }, options?: PlakyRequestOverrides): Promise<PagedResult<ShortUserShape>> {
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

  iterate(opts: { pageSize?: number; limit?: number } = {}): PaginatedIterator<ShortUserShape> {
    return paginate<ShortUserShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ page, pageSize });
        return { data: (res.data ?? []) as ShortUserShape[], hasMore: res.hasMore === true, raw: res };
      },
      opts,
    );
  }

  async listAll(opts: { pageSize?: number; limit?: number } = {}): Promise<ShortUserShape[]> {
    const out: ShortUserShape[] = [];
    for await (const u of this.iterate(opts)) out.push(u);
    return out;
  }
}
