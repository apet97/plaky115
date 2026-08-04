// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=replaceCommentReactions
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemId: int64Id.describe("Represents unique item identifier across the system."),
  itemCommentId: int64Id.describe("Represents unique item comment identifier across the system."),
  body: z.record(z.unknown()).superRefine((body, ctx) => { if (!Object.prototype.hasOwnProperty.call(body, "reactions")) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reactions"], message: "required" }); }).describe("JSON request body for Replace comment reactions."),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

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
    const result = await ctx.attempt.mutate({
      operation: "replaceCommentReactions",
      targetIds: { spaceId: String(parsed.spaceId), boardId: String(parsed.boardId), itemId: String(parsed.itemId), itemCommentId: String(parsed.itemCommentId) },
      run: async () => {
        const result = await request<Record<string, unknown>>({
          method: "PUT",
          path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments/${encodeURIComponent(String(parsed.itemCommentId))}/reactions`,
          body: parsed.body,
          operationId: "replaceCommentReactions",
        }, ctx.requestOptions);
        rawOutput.parse(result);
        return result;
      },
    });
    return ctx.respond(result, { compactKind: "raw" });
  },
};
