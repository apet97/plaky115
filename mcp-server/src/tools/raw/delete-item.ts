// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItem
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  itemId: z.union([z.string(), z.number()]).describe("Plaky item ID within the selected board."),
});
const output = z.object({ ok: z.boolean() });

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
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    await request({
      method: "DELETE",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}`,
      responseType: "void",
      operationId: "deleteItem",
    }, ctx.requestOptions);
    return ctx.respond({ ok: true }, { compactKind: "raw" });
  },
};
