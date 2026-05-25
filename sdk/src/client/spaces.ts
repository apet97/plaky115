import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId } from "../runtime/ids.js";
import type { PagedResult, SpaceShape } from "./shapes.js";

export class SpacesResource {
  constructor(private readonly client: PlakyClient) {}

  list(query?: { page?: number; pageSize?: number }, options?: PlakyRequestOverrides): Promise<PagedResult<SpaceShape>> {
    return this.client.request<PagedResult<SpaceShape>>(
      {
        method: "GET",
        path: "/v1/public/spaces",
        query,
        operationId: "listSpaces",
      },
      options,
    );
  }

  get(spaceId: SpaceId | string | number, options?: PlakyRequestOverrides): Promise<SpaceShape> {
    return this.client.request<SpaceShape>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}`,
        operationId: "getSpace",
      },
      options,
    );
  }

  iterate(opts: { pageSize?: number; limit?: number } = {}): PaginatedIterator<SpaceShape> {
    return paginate<SpaceShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ page, pageSize });
        return { data: (res.data ?? []) as SpaceShape[], hasMore: res.hasMore === true, raw: res };
      },
      opts,
    );
  }

  async listAll(opts: { pageSize?: number; limit?: number } = {}): Promise<SpaceShape[]> {
    const out: SpaceShape[] = [];
    for await (const s of this.iterate(opts)) out.push(s);
    return out;
  }
}
