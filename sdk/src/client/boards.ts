import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId } from "../runtime/ids.js";
import type { PagedResult, BoardShape } from "./shapes.js";

export class BoardsResource {
  constructor(private readonly client: PlakyClient) {}

  list(params: { spaceId: SpaceId | string | number; page?: number; pageSize?: number }, options?: PlakyRequestOverrides): Promise<PagedResult<BoardShape>> {
    const { spaceId, ...query } = params;
    return this.client.request<PagedResult<BoardShape>>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}/boards`,
        query,
        operationId: "listBoards",
      },
      options,
    );
  }

  get(params: { spaceId: SpaceId | string | number; boardId: BoardId | string | number }, options?: PlakyRequestOverrides): Promise<BoardShape> {
    return this.client.request<BoardShape>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}`,
        operationId: "getBoard",
      },
      options,
    );
  }

  iterate(params: { spaceId: SpaceId; pageSize?: number; limit?: number }): PaginatedIterator<BoardShape> {
    return paginate<BoardShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ spaceId: params.spaceId, page, pageSize });
        return { data: (res.data ?? []) as BoardShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize: params.pageSize, limit: params.limit },
    );
  }

  async listAll(params: { spaceId: SpaceId; pageSize?: number; limit?: number }): Promise<BoardShape[]> {
    const out: BoardShape[] = [];
    for await (const b of this.iterate(params)) out.push(b);
    return out;
  }
}
