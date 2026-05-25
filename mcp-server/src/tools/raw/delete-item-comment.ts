// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemComment
import { z } from "zod/v3";
import { deleteItemComment } from "plaky115/operations/delete-item-comment.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  itemCommentId: z.union([z.string(), z.number()]).describe("itemCommentId"),
});

export const deleteItemCommentTool: McpToolDefinition = {
  name: "plaky_delete_item_comment",
  title: "Delete item comment",
  description: "Delete item comment",
  scopes: ["write","destructive"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await deleteItemComment(input as Parameters<typeof deleteItemComment>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
