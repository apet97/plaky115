// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItem
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
});

export const getItemTool: McpToolDefinition = {
  name: "plaky_get_item",
  title: "Get item",
  description: "Retrieve an item",
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
    const result = await request({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}`,
      operationId: "getItem",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
