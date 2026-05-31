// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getBoard
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
});
const output = z.object({}).passthrough();

export const getBoardTool: McpToolDefinition = {
  name: "plaky_get_board",
  title: "Get board",
  description: "Retrieve a board",
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
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}`,
      operationId: "getBoard",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
