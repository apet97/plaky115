import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";
import type { PagedResult, CommentShape } from "./shapes.js";

export type CommentScopeParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
};

export class ItemCommentsResource {
  constructor(private readonly client: PlakyClient) {}

  list(params: CommentScopeParams & { page?: number; pageSize?: number }, options?: PlakyRequestOverrides): Promise<PagedResult<CommentShape>> {
    const { spaceId, boardId, itemId, ...query } = params;
    return this.client.request<PagedResult<CommentShape>>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}/boards/${pathSegment(boardId)}/items/${pathSegment(itemId)}/comments`,
        query,
        operationId: "listItemComments",
      },
      options,
    );
  }

  async create(params: CommentScopeParams & { body: Record<string, unknown>; idempotencyKey?: string }, options?: PlakyRequestOverrides): Promise<CommentShape> {
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("comment");
    return this.client.request<CommentShape>(
      {
        method: "POST",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}/comments`,
        body: params.body,
        operationId: "createItemComment",
      },
      { ...options, idempotencyKey },
    );
  }

  async update(
    params: CommentScopeParams & { itemCommentId: CommentId | string | number; body: Record<string, unknown>; idempotencyKey?: string },
    options?: PlakyRequestOverrides,
  ): Promise<CommentShape> {
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("comment-up");
    return this.client.request<CommentShape>(
      {
        method: "PUT",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}/comments/${pathSegment(params.itemCommentId)}`,
        body: params.body,
        operationId: "updateItemComment",
      },
      { ...options, idempotencyKey },
    );
  }

  async delete(params: CommentScopeParams & { itemCommentId: CommentId | string | number; idempotencyKey?: string }, options?: PlakyRequestOverrides): Promise<void> {
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("comment-del");
    await this.client.request<void>(
      {
        method: "DELETE",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}/comments/${pathSegment(params.itemCommentId)}`,
        operationId: "deleteItemComment",
        responseType: "void",
      },
      { ...options, idempotencyKey },
    );
  }

  iterate(params: CommentScopeParams & { pageSize?: number; limit?: number }): PaginatedIterator<CommentShape> {
    return paginate<CommentShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...params, page, pageSize });
        return { data: (res.data ?? []) as CommentShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize: params.pageSize, limit: params.limit },
    );
  }

  async listAll(params: CommentScopeParams & { pageSize?: number; limit?: number }): Promise<CommentShape[]> {
    const out: CommentShape[] = [];
    for await (const c of this.iterate(params)) out.push(c);
    return out;
  }
}
