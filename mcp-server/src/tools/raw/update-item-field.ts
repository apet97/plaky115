// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemField
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  itemId: z.union([z.string(), z.number()]).describe("Plaky item ID within the selected board."),
  itemFieldKey: z.union([z.string(), z.number()]).describe("Field key to update, such as status-1 or string-2."),
  body: z.record(z.unknown()).describe("JSON request body for Update one item field."),
});
const output = z.object({}).passthrough();

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
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "PATCH",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/fields/${encodeURIComponent(String(parsed.itemFieldKey))}`,
      body: parsed.body,
      operationId: "updateItemField",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
