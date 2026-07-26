// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItemGroup
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemGroupId: z.number().int().describe("Represents unique item group identifier across the system."),
});
const output = z.object({}).passthrough();

export const getItemGroupTool: McpToolDefinition = {
  name: "plaky_get_item_group",
  title: "Get item group",
  description: "Retrieve an item group",
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
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/item-groups/${encodeURIComponent(String(parsed.itemGroupId))}`,
      operationId: "getItemGroup",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "itemGroup" });
  },
};
