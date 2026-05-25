// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemField
import { z } from "zod/v3";
import { updateItemField } from "plaky115/operations/update-item-field.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  itemFieldKey: z.union([z.string(), z.number()]).describe("itemFieldKey"),
  body: z.record(z.unknown()).optional(),
});

export const updateItemFieldTool: McpToolDefinition = {
  name: "plaky_update_item_field",
  title: "Update item field",
  description: "Update one item field",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await updateItemField(input as Parameters<typeof updateItemField>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
