// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItemGroups
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  page: z.number().int().describe("Page number.").optional(),
  pageSize: z.number().int().describe("Page size.").optional(),
});
const output = z.object({}).passthrough();

export const listItemGroupsTool: McpToolDefinition = {
  name: "plaky_list_item_groups",
  title: "List item groups",
  description: "List board item groups",
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
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/item-groups`,
      query,
      operationId: "listItemGroups",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "itemGroup" });
  },
};
