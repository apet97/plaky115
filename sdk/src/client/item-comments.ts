import type { PlakyClient } from "./client.js";
import { listItemComments } from "../generated/operations/list-item-comments.js";
import { createItemComment } from "../generated/operations/create-item-comment.js";
import { updateItemComment } from "../generated/operations/update-item-comment.js";
import { deleteItemComment } from "../generated/operations/delete-item-comment.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";
import type { PagedResult, CommentShape } from "./shapes.js";

export type CommentScopeParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  itemId: ItemId;
};

export class ItemCommentsResource {
  constructor(private readonly client: PlakyClient) {}

  list(params: CommentScopeParams & { page?: number; pageSize?: number }): Promise<PagedResult<CommentShape>> {
    const { spaceId, boardId, itemId, ...query } = params;
    return listItemComments({ spaceId, boardId, itemId, query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<CommentShape>>;
  }

  async create(params: CommentScopeParams & { body: Record<string, unknown>; idempotencyKey?: string }): Promise<CommentShape> {
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("comment");
    return createItemComment(
      { spaceId: params.spaceId, boardId: params.boardId, itemId: params.itemId, body: params.body as never },
      this.client.requestOptions({ idempotencyKey }),
    ) as unknown as Promise<CommentShape>;
  }

  async update(params: CommentScopeParams & { itemCommentId: CommentId; body: Record<string, unknown>; idempotencyKey?: string }): Promise<CommentShape> {
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("comment-up");
    return updateItemComment(
      {
        spaceId: params.spaceId,
        boardId: params.boardId,
        itemId: params.itemId,
        itemCommentId: params.itemCommentId,
        body: params.body as never,
      },
      this.client.requestOptions({ idempotencyKey }),
    ) as unknown as Promise<CommentShape>;
  }

  async delete(params: CommentScopeParams & { itemCommentId: CommentId; idempotencyKey?: string }): Promise<void> {
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("comment-del");
    await deleteItemComment(
      {
        spaceId: params.spaceId,
        boardId: params.boardId,
        itemId: params.itemId,
        itemCommentId: params.itemCommentId,
      },
      this.client.requestOptions({ idempotencyKey }),
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
