// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listBoards
import { z } from "zod/v3";
import { listBoards } from "plaky115/operations/list-boards.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export const listBoardsTool: McpToolDefinition = {
  name: "plaky_list_boards",
  title: "List boards",
  description: "List space boards",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await listBoards(input as Parameters<typeof listBoards>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
