// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItemFileDownload
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Represents unique board identifier across the system."),
  itemId: z.number().int().describe("Represents unique item identifier across the system."),
  itemFileId: z.number().int().describe("Represents unique item file identifier across the system."),
});
const output = z.object({}).passthrough();

export const getItemFileDownloadTool: McpToolDefinition = {
  name: "plaky_get_item_file_download",
  title: "Get item file download",
  description: "Get an item file download link",
  scopes: ["read"],
  sensitiveOutput: true,
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
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/files/${encodeURIComponent(String(parsed.itemFileId))}/download`,
      operationId: "getItemFileDownload",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "downloadLink" });
  },
};
