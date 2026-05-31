// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemField
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  itemFieldKey: z.union([z.string(), z.number()]).describe("itemFieldKey"),
  body: z.record(z.unknown()).optional(),
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
