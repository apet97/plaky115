// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getBoard
import { z } from "zod/v3";
import { getBoard } from "plaky115/operations/get-board.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
});

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
  async handler(input, ctx) {
    const result = await getBoard(input as Parameters<typeof getBoard>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
