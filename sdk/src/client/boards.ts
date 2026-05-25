import type { PlakyClient } from "./client.js";
import { listBoards } from "../generated/operations/list-boards.js";
import { getBoard } from "../generated/operations/get-board.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { SpaceId, BoardId } from "../runtime/ids.js";
import type { PagedResult, BoardShape } from "./shapes.js";

export class BoardsResource {
  constructor(private readonly client: PlakyClient) {}

  list(params: { spaceId: SpaceId; page?: number; pageSize?: number }): Promise<PagedResult<BoardShape>> {
    const { spaceId, ...query } = params;
    return listBoards({ spaceId, query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<BoardShape>>;
  }

  get(params: { spaceId: SpaceId; boardId: BoardId }): Promise<BoardShape> {
    return getBoard(params, this.client.requestOptions()) as unknown as Promise<BoardShape>;
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
