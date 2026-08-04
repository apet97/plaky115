// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemComment
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemId: int64Id.describe("Represents unique item identifier across the system."),
  itemCommentId: int64Id.describe("Represents unique item comment identifier across the system."),
  body: z.record(z.unknown()).superRefine((body, ctx) => { if (!Object.prototype.hasOwnProperty.call(body, "text")) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "required" }); }).describe("JSON request body for Update item comment."),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

export const updateItemCommentTool: McpToolDefinition = {
  name: "plaky_update_item_comment",
  title: "Update item comment",
  description: "Update item comment",
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
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments/${encodeURIComponent(String(parsed.itemCommentId))}`,
      body: parsed.body,
      operationId: "updateItemComment",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "comment" });
  },
};
