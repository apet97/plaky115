// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItemComment
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemId: z.number().int().describe("Represents unique item identifier across the system."),
  body: z.record(z.unknown()).describe("JSON request body for Create item comment."),
});
const output = z.object({}).passthrough();

export const createItemCommentTool: McpToolDefinition = {
  name: "plaky_create_item_comment",
  title: "Create item comment",
  description: "Create item comment",
  scopes: ["write"],
  sensitiveOutput: false,
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
    const result = await request<Record<string, unknown>>({
      method: "POST",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments`,
      body: parsed.body,
      operationId: "createItemComment",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "comment" });
  },
};
