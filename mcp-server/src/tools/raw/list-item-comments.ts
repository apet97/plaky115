// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItemComments
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  itemId: z.union([z.string(), z.number()]).describe("Plaky item ID within the selected board."),
});
const output = z.object({}).passthrough();

export const listItemCommentsTool: McpToolDefinition = {
  name: "plaky_list_item_comments",
  title: "List item comments",
  description: "List item comments",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments`,
      operationId: "listItemComments",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "comment" });
  },
};
