// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItem
import { z } from "zod/v3";
import { getItem } from "plaky115/operations/get-item.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
});

export const getItemTool: McpToolDefinition = {
  name: "plaky_get_item",
  title: "Get item",
  description: "Retrieve an item",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await getItem(input as Parameters<typeof getItem>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
