// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemComment
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  itemCommentId: z.union([z.string(), z.number()]).describe("itemCommentId"),
});

export const deleteItemCommentTool: McpToolDefinition = {
  name: "plaky_delete_item_comment",
  title: "Delete item comment",
  description: "Delete item comment",
  scopes: ["write","destructive"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "DELETE",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments/${encodeURIComponent(String(parsed.itemCommentId))}`,
      responseType: "void",
      operationId: "deleteItemComment",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
