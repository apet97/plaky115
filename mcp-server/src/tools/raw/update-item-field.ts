// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemField
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemId: z.number().int().describe("Represents unique item identifier across the system."),
  itemFieldKey: z.string().describe("Represents key of the field."),
  body: z.record(z.unknown()).describe("JSON request body for Update one item field."),
});
const output = z.object({}).passthrough();

export const updateItemFieldTool: McpToolDefinition = {
  name: "plaky_update_item_field",
  title: "Update item field",
  description: "Update one item field",
  scopes: ["write"],
  sensitiveOutput: false,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request<Record<string, unknown>>({
      method: "PATCH",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/fields/${encodeURIComponent(String(parsed.itemFieldKey))}`,
      body: parsed.body,
      operationId: "updateItemField",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
