// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItems
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  boardViewId: int64Id.describe("Represents unique board view identifier across the system.").optional(),
  parentId: int64Id.describe("Represents unique item identifier across the system.").optional(),
  subitemsBehaviour: z.enum(["INCLUDE","EXCLUDE","EMBED"]).describe("Indicates how subitems are treated in the response. By default subitems will be included. This flag is not applicable when **parentId** is set. **Options:** * **INCLUDE**: Includes subitems in the top level response. * **EXCLUDE**: Excludes subitems from the top level response. * **EMBED**: Excludes from top level and embeds into each parent with sorts and filters applied.").optional(),
  expand: z.array(z.enum(["space","board","group","createdBy","parent","subscriptions","fields"])).describe("Comma-separated list of relationships to expand into full objects instead of IDs.").optional(),
  page: z.number().int().describe("Page number.").optional(),
  pageSize: z.number().int().describe("Page size.").optional(),
});
const output = z.object({}).passthrough();

export const listItemsTool: McpToolDefinition = {
  name: "plaky_list_items",
  title: "List board items",
  description: "List board items",
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
      ...(parsed.boardViewId !== undefined ? { boardViewId: parsed.boardViewId } : {}),
      ...(parsed.parentId !== undefined ? { parentId: parsed.parentId } : {}),
      ...(parsed.subitemsBehaviour !== undefined ? { subitemsBehaviour: parsed.subitemsBehaviour } : {}),
      ...(parsed.expand !== undefined ? { expand: parsed.expand } : {}),
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items`,
      query,
      operationId: "listItems",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
