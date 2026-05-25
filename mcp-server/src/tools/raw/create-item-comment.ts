// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItemComment
import { z } from "zod/v3";
import { createItemComment } from "plaky115/operations/create-item-comment.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  body: z.record(z.unknown()).optional(),
});

export const createItemCommentTool: McpToolDefinition = {
  name: "plaky_create_item_comment",
  title: "Create item comment",
  description: "Create item comment",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await createItemComment(input as Parameters<typeof createItemComment>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
