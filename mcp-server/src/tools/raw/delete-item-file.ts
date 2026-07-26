// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemFile
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.number().int().describe("Represents unique space identifier across the system."),
  boardId: z.number().int().describe("Unique identifier of the board."),
  itemId: z.number().int().describe("Represents unique board identifier across the system."),
  itemFileId: z.number().int().describe("Represents unique item file identifier across the system."),
});
const output = z.object({ ok: z.boolean() });

export const deleteItemFileTool: McpToolDefinition = {
  name: "plaky_delete_item_file",
  title: "Delete item file",
  description: "Delete an item file",
  scopes: ["write","destructive"],
  sensitiveOutput: false,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    await request<void>({
      method: "DELETE",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/files/${encodeURIComponent(String(parsed.itemFileId))}`,
      responseType: "void",
      operationId: "deleteItemFile",
    }, ctx.requestOptions);
    return ctx.respond({ ok: true }, { compactKind: "raw" });
  },
};
