// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItemComment
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  body: z.record(z.unknown()).optional(),
});
const output = z.object({}).passthrough();

export const createItemCommentTool: McpToolDefinition = {
  name: "plaky_create_item_comment",
  title: "Create item comment",
  description: "Create item comment",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "POST",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments`,
      body: parsed.body,
      operationId: "createItemComment",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
