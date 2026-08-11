import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { assertArrayResult, paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { resolveExplicitIdempotencyKey } from "../runtime/idempotency.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";
import type { StrictPagedResult, CommentShape } from "./shapes.js";
import type { components } from "../generated/types.js";
import { normalizeCommentPlan } from "../workflows/mutation-plans.js";

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
   * List the comments on an item. The `listItemComments` endpoint is
   * non-paginated and returns a bare JSON array (live-confirmed); this method
   * normalizes that array into the validated {@link StrictPagedResult} envelope
   * (`hasMore` is always `false`) so `iterate`/`listAll` work consistently with
   * the other list resources.
   *
   * @param params - `spaceId`, `boardId`, and `itemId`.
   * @param options - Per-request overrides.
   * @returns A single page of comments. Each comment exposes `content` (API
   *   field) and `text` (kept for compatibility).
   */
  async list(params: CommentScopeParams, options?: ResourceRequestOverrides): Promise<StrictPagedResult<CommentShape>> {
    const { spaceId, boardId, itemId } = params;
    const res = await this.client.request<unknown>(
      {
        method: "GET",
        path: `/v1/public/spaces/${idPathSegment(spaceId)}/boards/${idPathSegment(boardId)}/items/${idPathSegment(itemId)}/comments`,
        operationId: "listItemComments",
      },
      options,
    );
    return { data: assertArrayResult<CommentShape>(res, "listItemComments"), hasMore: false };
  }

  /**
   * Create a comment on an item. The request field is `text`; the response field
   * is `content`. Sends an idempotency key only when supplied explicitly.
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
  async create(params: CommentScopeParams & { body: CommentWriteBody; idempotencyKey?: string }, options?: ResourceRequestOverrides): Promise<CommentShape> {
    const normalized = normalizeCommentPlan(params);
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<CommentShape>(
      {
        method: "POST",
        path: `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/items/${idPathSegment(params.itemId)}/comments`,
        body: normalized.body,
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
    options?: ResourceRequestOverrides,
  ): Promise<CommentShape> {
    const normalized = normalizeCommentPlan({ ...params, operationId: "updateItemComment" });
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<CommentShape>(
      {
        method: "PUT",
        path: `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/items/${idPathSegment(params.itemId)}/comments/${idPathSegment(params.itemCommentId)}`,
        body: normalized.body,
        operationId: "updateItemComment",
      },
      { ...options, idempotencyKey },
    );
  }

  /**
   * Delete a comment. Destructive. Sends no implicit idempotency key.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `itemCommentId`, optional `idempotencyKey`.
   * @param options - Per-request overrides.
   * @returns Nothing; resolves once the API confirms deletion.
   */
  async delete(params: CommentScopeParams & { itemCommentId: CommentId | string | number; idempotencyKey?: string }, options?: ResourceRequestOverrides): Promise<void> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    await this.client.request<void>(
      {
        method: "DELETE",
        path: `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/items/${idPathSegment(params.itemId)}/comments/${idPathSegment(params.itemCommentId)}`,
        operationId: "deleteItemComment",
        responseType: "void",
      },
      { ...options, idempotencyKey },
    );
  }

  /**
   * Lazily iterate comments on an item across pages. `limit` is a client-side cap.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, and optional client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(params: CommentScopeParams & { limit?: number }, options?: ResourceRequestOverrides): PaginatedIterator<CommentShape> {
    return paginate<CommentShape>(
      async () => {
        const res = await this.list(params, options);
        return { data: res.data, hasMore: res.hasMore, raw: res };
      },
      { limit: params.limit },
    );
  }

  /**
   * Collect all comments on an item into an array, walking every page.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, and optional client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns Every comment on the item.
   */
  async listAll(params: CommentScopeParams & { limit?: number }, options?: ResourceRequestOverrides): Promise<CommentShape[]> {
    const out: CommentShape[] = [];
    for await (const c of this.iterate(params, options)) out.push(c);
    return out;
  }
}
