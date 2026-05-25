// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemComment
import { z } from "zod/v3";
import { updateItemComment } from "plaky115/operations/update-item-comment.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  itemCommentId: z.union([z.string(), z.number()]).describe("itemCommentId"),
  body: z.record(z.unknown()).optional(),
});

export const updateItemCommentTool: McpToolDefinition = {
  name: "plaky_update_item_comment",
  title: "Update item comment",
  description: "Update item comment",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await updateItemComment(input as Parameters<typeof updateItemComment>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
