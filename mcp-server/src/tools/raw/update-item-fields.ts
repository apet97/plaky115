// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemFields
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  itemId: z.union([z.string(), z.number()]).describe("Plaky item ID within the selected board."),
  body: z.record(z.unknown()).describe("JSON request body for Update item fields."),
});
const output = z.object({}).passthrough();

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
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "PATCH",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/fields`,
      body: parsed.body,
      operationId: "updateItemFields",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
