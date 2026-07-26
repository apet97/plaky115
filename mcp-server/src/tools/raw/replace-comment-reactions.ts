// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=replaceCommentReactions
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemId: z.number().int().describe("Represents unique item identifier across the system."),
  itemCommentId: z.number().int().describe("Represents unique item comment identifier across the system."),
  body: z.record(z.unknown()).describe("JSON request body for Replace comment reactions."),
});
const output = z.object({}).passthrough();

export const replaceCommentReactionsTool: McpToolDefinition = {
  name: "plaky_replace_comment_reactions",
  title: "Replace comment reactions",
  description: "Replace comment reactions",
  scopes: ["write"],
  sensitiveOutput: false,
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
    const result = await request<Record<string, unknown>>({
      method: "PUT",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments/${encodeURIComponent(String(parsed.itemCommentId))}/reactions`,
      body: parsed.body,
      operationId: "replaceCommentReactions",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
