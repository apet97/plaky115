import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId } from "../runtime/ids.js";
import type { PagedResult, BoardShape } from "./shapes.js";

/** Boards resource. Access via `client.boards`. */
export class BoardsResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * List a page of boards within a space.
   *
   * @param params - `spaceId` plus optional `page`/`pageSize`.
   * @param options - Per-request overrides.
   * @returns A page of boards with `data` and `hasMore`.
   * @throws {import("../runtime/errors.js").PlakyApiError} On API errors.
   */
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

  /**
   * Fetch one board by id within a space.
   *
   * @param params - `spaceId` and `boardId`.
   * @param options - Per-request overrides.
   * @returns The board.
   * @throws {import("../runtime/errors.js").PlakyNotFoundError} If the board does not exist.
   */
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

  /**
   * Lazily iterate boards in a space across pages. `limit` is a client-side cap.
   *
   * @param params - `spaceId`, optional `pageSize` and client-side `limit`.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(params: { spaceId: SpaceId; pageSize?: number; limit?: number }): PaginatedIterator<BoardShape> {
    return paginate<BoardShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ spaceId: params.spaceId, page, pageSize });
        return { data: (res.data ?? []) as BoardShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize: params.pageSize, limit: params.limit },
    );
  }

  /**
   * Collect all boards in a space into an array, walking every page.
   *
   * @param params - `spaceId`, optional `pageSize` and client-side `limit`.
   * @returns Every board in the space.
   */
  async listAll(params: { spaceId: SpaceId; pageSize?: number; limit?: number }): Promise<BoardShape[]> {
    const out: BoardShape[] = [];
    for await (const b of this.iterate(params)) out.push(b);
    return out;
  }
}
