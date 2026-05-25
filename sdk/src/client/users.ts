import type { PlakyClient } from "./client.js";
import { listUsers } from "../generated/operations/list-users.js";
import { getCurrentUser } from "../generated/operations/get-current-user.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PagedResult, UserShape, ShortUserShape } from "./shapes.js";

export class UsersResource {
  constructor(private readonly client: PlakyClient) {}

  list(query?: { page?: number; pageSize?: number }): Promise<PagedResult<ShortUserShape>> {
    return listUsers({ query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<ShortUserShape>>;
  }

  me(): Promise<UserShape> {
    return getCurrentUser({}, this.client.requestOptions()) as unknown as Promise<UserShape>;
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
