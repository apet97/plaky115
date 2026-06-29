import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { resolveIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, CommentId } from "../runtime/ids.js";
import type { components } from "../generated/types.js";

/**
 * Request body for replacing a comment's reactions, derived from the generated
 * `ReactionPutRequest`. Each `value` is the emoji's Unicode codepoint hex with
 * no `U+` prefix (e.g. `"1f44d"` for thumbs up), not the emoji character or a
 * shortname. An empty `reactions` array removes the caller's reactions.
 */
export type ReactionReplaceBody = components["schemas"]["ReactionPutRequest"];

/**
 * Response from replacing a comment's reactions, derived from the generated
 * `ReactionPutResponse`. `reactions` is a map keyed by reaction code whose
 * values list each reaction without its code (user id + timestamp).
 */
export type ReactionReplaceResult = components["schemas"]["ReactionPutResponse"];

export type ReplaceReactionsParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  itemCommentId: CommentId | string | number;
  body: ReactionReplaceBody;
  idempotencyKey?: string;
};

/** Comment reactions resource. Access via `client.reactions`. */
export class ReactionsResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * Replace the caller's reactions on a comment (HTTP PUT). The request body is
   * `{ reactions: [{ value }] }` where each `value` is the emoji's Unicode
   * codepoint hex (for example `"1f44d"`), not the emoji character or a
   * shortname. The response is the keyed-map {@link ReactionReplaceResult}.
   * An empty `reactions` array removes the caller's reactions.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `itemCommentId`, `body`
   *   ({@link ReactionReplaceBody}), optional `idempotencyKey`.
   * @param options - Per-request overrides.
   * @returns The reactions keyed by reaction code.
   * @example
   * ```ts
   * await client.reactions.replace({
   *   spaceId, boardId, itemId, itemCommentId,
   *   body: { reactions: [{ value: "1f44d" }] },
   * });
   * ```
   */
  async replace(params: ReplaceReactionsParams, options?: PlakyRequestOverrides): Promise<ReactionReplaceResult> {
    const idempotencyKey = resolveIdempotencyKey(params, options, "reactions");
    return this.client.request<ReactionReplaceResult>(
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
