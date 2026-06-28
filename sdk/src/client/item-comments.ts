import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";
import type { PagedResult, CommentShape } from "./shapes.js";
import type { components } from "../generated/types.js";

export type CommentScopeParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
};

/**
 * Request body for creating or updating a comment, derived from the generated
 * `CommentRequest`. The API request field is `text` (the response field is
 * `content`); `repliesToId` targets a parent comment when creating a reply.
 */
export type CommentWriteBody = components["schemas"]["CommentRequest"];

/** Item comments resource. Access via `client.comments`. */
export class ItemCommentsResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * List a page of comments on an item.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, optional `page`/`pageSize`.
   * @param options - Per-request overrides.
   * @returns A page of comments. Each comment exposes `content` (API field) and
   *   `text` (kept for compatibility).
   */
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

  /**
   * Create a comment on an item. The request field is `text`; the response field
   * is `content`. Attaches a generated idempotency key by default.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `body` ({@link CommentWriteBody}),
   *   optional `idempotencyKey`.
   * @param options - Per-request overrides.
   * @returns The created comment.
   * @example
   * ```ts
   * await client.comments.create({ spaceId, boardId, itemId, body: { text: "Note" } });
   * ```
   */
  async create(params: CommentScopeParams & { body: CommentWriteBody; idempotencyKey?: string }, options?: PlakyRequestOverrides): Promise<CommentShape> {
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

  /**
   * Update a comment's text (HTTP PUT). The request field is `text`.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `itemCommentId`, `body`,
   *   optional `idempotencyKey`.
   * @param options - Per-request overrides.
   * @returns The updated comment.
   */
  async update(
    params: CommentScopeParams & { itemCommentId: CommentId | string | number; body: CommentWriteBody; idempotencyKey?: string },
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

  /**
   * Delete a comment. Destructive. Attaches a generated idempotency key by default.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `itemCommentId`, optional `idempotencyKey`.
   * @param options - Per-request overrides.
   * @returns Nothing; resolves once the API confirms deletion.
   */
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

  /**
   * Lazily iterate comments on an item across pages. `limit` is a client-side cap.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, optional `pageSize`/`limit`.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(params: CommentScopeParams & { pageSize?: number; limit?: number }): PaginatedIterator<CommentShape> {
    return paginate<CommentShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...params, page, pageSize });
        return { data: (res.data ?? []) as CommentShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize: params.pageSize, limit: params.limit },
    );
  }

  /**
   * Collect all comments on an item into an array, walking every page.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, optional `pageSize`/`limit`.
   * @returns Every comment on the item.
   */
  async listAll(params: CommentScopeParams & { pageSize?: number; limit?: number }): Promise<CommentShape[]> {
    const out: CommentShape[] = [];
    for await (const c of this.iterate(params)) out.push(c);
    return out;
  }
}
