// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItems
import { z } from "zod/v3";
import { listItems } from "plaky115/operations/list-items.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export const listItemsTool: McpToolDefinition = {
  name: "plaky_list_items",
  title: "List board items",
  description: "List board items",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await listItems(input as Parameters<typeof listItems>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
