// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSubitems
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemId: z.number().int().describe("Represents unique item identifier across the system."),
  expand: z.array(z.enum(["space","board","group","createdBy","parent","subscriptions","fields"])).describe("Comma-separated list of relationships to expand into full objects instead of IDs.").optional(),
  page: z.number().int().describe("Page number.").optional(),
  pageSize: z.number().int().describe("Page size.").optional(),
});
const output = z.object({}).passthrough();

export const listSubitemsTool: McpToolDefinition = {
  name: "plaky_list_subitems",
  title: "List subitems",
  description: "List subitems",
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
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/sub-items`,
      query,
      operationId: "listSubitems",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
