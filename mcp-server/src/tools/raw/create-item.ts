// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItem
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  body: z.record(z.unknown()).optional(),
});

export const createItemTool: McpToolDefinition = {
  name: "plaky_create_item",
  title: "Create item",
  description: "Create an item",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "POST",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items`,
      body: parsed.body,
      operationId: "createItem",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
