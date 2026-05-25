// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItemComments
import { z } from "zod/v3";
import { listItemComments } from "plaky115/operations/list-item-comments.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
});

export const listItemCommentsTool: McpToolDefinition = {
  name: "plaky_list_item_comments",
  title: "List item comments",
  description: "List item comments",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await listItemComments(input as Parameters<typeof listItemComments>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
