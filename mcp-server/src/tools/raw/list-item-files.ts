// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listItemFiles
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemId: z.number().int().describe("Represents unique item identifier across the system."),
});
const output = z.object({ data: z.array(z.unknown()) });

export const listItemFilesTool: McpToolDefinition = {
  name: "plaky_list_item_files",
  title: "List item files",
  description: "List item files",
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
    const result = await request<unknown[]>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/files`,
      operationId: "listItemFiles",
    }, ctx.requestOptions);
    return ctx.respond({ data: result }, { compactKind: "itemFile" });
  },
};
