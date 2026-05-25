import type { PlakyClient } from "./client.js";
import { listSpaces } from "../generated/operations/list-spaces.js";
import { getSpace } from "../generated/operations/get-space.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { SpaceId } from "../runtime/ids.js";
import type { PagedResult, SpaceShape } from "./shapes.js";

export class SpacesResource {
  constructor(private readonly client: PlakyClient) {}

  list(query?: { page?: number; pageSize?: number }): Promise<PagedResult<SpaceShape>> {
    return listSpaces({ query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<SpaceShape>>;
  }

  get(spaceId: SpaceId): Promise<SpaceShape> {
    return getSpace({ spaceId }, this.client.requestOptions()) as unknown as Promise<SpaceShape>;
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
