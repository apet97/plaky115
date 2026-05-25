// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=replaceCommentReactions
import { z } from "zod/v3";
import { replaceCommentReactions } from "plaky115/operations/replace-comment-reactions.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  itemCommentId: z.union([z.string(), z.number()]).describe("itemCommentId"),
  body: z.record(z.unknown()).optional(),
});

export const replaceCommentReactionsTool: McpToolDefinition = {
  name: "plaky_replace_comment_reactions",
  title: "Replace comment reactions",
  description: "Replace comment reactions",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await replaceCommentReactions(input as Parameters<typeof replaceCommentReactions>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
