// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItems
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  page: z.number().int().min(1).describe("One-based result page to request.").optional(),
  pageSize: z.number().int().min(1).max(200).describe("Maximum number of records to return for this page.").optional(),
  expand: z.string().describe("Comma-separated list of relationships to expand into full objects instead of IDs.").optional(),
});
const output = z.object({}).passthrough();

export const listItemsTool: McpToolDefinition = {
  name: "plaky_list_items",
  title: "List board items",
  description: "List board items",
  scopes: ["read"],
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
      ...(parsed.expand !== undefined ? { expand: parsed.expand } : {}),
    };
    const result = await request({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items`,
      query,
      operationId: "listItems",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
