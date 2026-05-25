// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemFields
import { z } from "zod/v3";
import { updateItemFields } from "plaky115/operations/update-item-fields.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  body: z.record(z.unknown()).optional(),
});

export const updateItemFieldsTool: McpToolDefinition = {
  name: "plaky_update_item_fields",
  title: "Update item fields",
  description: "Update item fields",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await updateItemFields(input as Parameters<typeof updateItemFields>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
