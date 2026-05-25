import type { PlakyClient } from "./client.js";
import { replaceCommentReactions } from "../generated/operations/replace-comment-reactions.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";

export type ReplaceReactionsParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  itemId: ItemId;
  itemCommentId: CommentId;
  body: Record<string, unknown>;
  idempotencyKey?: string;
};

export class ReactionsResource {
  constructor(private readonly client: PlakyClient) {}

  async replace(params: ReplaceReactionsParams): Promise<unknown> {
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("reactions");
    return replaceCommentReactions(
      {
        spaceId: params.spaceId,
        boardId: params.boardId,
        itemId: params.itemId,
        itemCommentId: params.itemCommentId,
        body: params.body as never,
      },
      this.client.requestOptions({ idempotencyKey }),
    );
  }
}
