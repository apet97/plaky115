// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItem
import { z } from "zod/v3";
import { deleteItem } from "plaky115/operations/delete-item.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
});

export const deleteItemTool: McpToolDefinition = {
  name: "plaky_delete_item",
  title: "Delete item",
  description: "Delete an item",
  scopes: ["write","destructive"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await deleteItem(input as Parameters<typeof deleteItem>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
