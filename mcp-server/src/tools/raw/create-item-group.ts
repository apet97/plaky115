// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItemGroup
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  body: z.record(z.unknown()).describe("JSON request body for Create an item group."),
});
const output = z.object({}).passthrough();

export const createItemGroupTool: McpToolDefinition = {
  name: "plaky_create_item_group",
  title: "Create item group",
  description: "Create an item group",
  scopes: ["write"],
  sensitiveOutput: false,
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
    const result = await request<Record<string, unknown>>({
      method: "POST",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/item-groups`,
      body: parsed.body,
      operationId: "createItemGroup",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "itemGroup" });
  },
};
