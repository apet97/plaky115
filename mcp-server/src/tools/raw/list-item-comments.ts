// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItemComments
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemId: int64Id.describe("Represents unique item identifier across the system."),
}).strict();
const output = z.object({ data: z.array(z.unknown()) });
const rawOutput = z.array(z.unknown());

export const listItemCommentsTool: McpToolDefinition = {
  name: "plaky_list_item_comments",
  title: "List item comments",
  description: "List item comments",
  scopes: ["read"],
  sensitiveOutput: false,
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
    const result = await request<unknown[]>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/comments`,
      operationId: "listItemComments",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond({ data: result }, { compactKind: "comment" });
  },
};
