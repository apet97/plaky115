// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemComment
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  itemId: z.union([z.string(), z.number()]).describe("Plaky item ID within the selected board."),
  itemCommentId: z.union([z.string(), z.number()]).describe("Plaky comment ID on the selected item."),
  body: z.record(z.unknown()).describe("JSON request body for Update item comment.").optional(),
});
const output = z.object({}).passthrough();

export const updateItemCommentTool: McpToolDefinition = {
  name: "plaky_update_item_comment",
  title: "Update item comment",
  description: "Update item comment",
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
      method: "PUT",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments/${encodeURIComponent(String(parsed.itemCommentId))}`,
      body: parsed.body,
      operationId: "updateItemComment",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
