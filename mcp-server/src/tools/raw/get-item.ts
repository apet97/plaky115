// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItem
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemId: int64Id.describe("Represents unique item identifier across the system."),
  expand: z.array(z.enum(["space","board","group","createdBy","parent","subscriptions","fields"])).describe("Comma-separated list of relationships to expand into full objects instead of IDs.").optional(),
});
const output = z.object({}).passthrough();

export const getItemTool: McpToolDefinition = {
  name: "plaky_get_item",
  title: "Get item",
  description: "Retrieve an item",
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
    const query = {
      ...(parsed.expand !== undefined ? { expand: parsed.expand } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}`,
      query,
      operationId: "getItem",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
