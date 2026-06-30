// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItems
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("Plaky space ID for the target workspace area."),
  boardId: z.union([z.string(), z.number()]).describe("Plaky board ID within the selected space."),
  page: z.number().int().min(1).describe("One-based result page to request.").optional(),
  pageSize: z.number().int().min(1).max(200).describe("Maximum number of records to return for this page.").optional(),
  boardViewId: z.string().describe("Represents unique board view identifier across the system.").optional(),
  parentId: z.string().describe("Represents unique item identifier across the system.").optional(),
  subitemsBehaviour: z.string().describe("Indicates how subitems are treated in the response. By default subitems will be included. This flag is not applicable when **parentId** is set. **Options:** * **INCLUDE**: Includes subitems in the top level response. * **EXCLUDE**: Excludes subitems from the top level response. * **EMBED**: Excludes from top level and embeds into each parent with sorts and filters applied.").optional(),
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
      ...(parsed.boardViewId !== undefined ? { boardViewId: parsed.boardViewId } : {}),
      ...(parsed.parentId !== undefined ? { parentId: parsed.parentId } : {}),
      ...(parsed.subitemsBehaviour !== undefined ? { subitemsBehaviour: parsed.subitemsBehaviour } : {}),
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
