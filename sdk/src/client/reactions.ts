import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";

export type ReplaceReactionsParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  itemCommentId: CommentId | string | number;
  body: Record<string, unknown>;
  idempotencyKey?: string;
};

export class ReactionsResource {
  constructor(private readonly client: PlakyClient) {}

  async replace(params: ReplaceReactionsParams, options?: PlakyRequestOverrides): Promise<unknown> {
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("reactions");
    return this.client.request<unknown>(
      {
        method: "PUT",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}/comments/${pathSegment(params.itemCommentId)}/reactions`,
        body: params.body,
        operationId: "replaceCommentReactions",
      },
      { ...options, idempotencyKey },
    );
  }
}
