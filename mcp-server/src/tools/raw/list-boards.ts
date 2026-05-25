// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listBoards
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
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
    const parsed = args.parse(input);
    const query = {
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards`,
      query,
      operationId: "listBoards",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "board" });
  },
};
