// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItem
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  body: z.record(z.unknown()).describe("JSON request body for Create an item.").optional(),
});
const output = z.object({}).passthrough();

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
  outputSchema: output,
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
