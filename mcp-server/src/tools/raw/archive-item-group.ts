// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=archiveItemGroup
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemGroupId: int64Id.describe("Represents unique item group identifier across the system."),
});
const output = z.object({ ok: z.boolean() });

export const archiveItemGroupTool: McpToolDefinition = {
  name: "plaky_archive_item_group",
  title: "Archive item group",
  description: "Archive an item group",
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
      method: "PUT",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/item-groups/${encodeURIComponent(String(parsed.itemGroupId))}/archive`,
      responseType: "void",
      operationId: "archiveItemGroup",
    }, ctx.requestOptions);
    return ctx.respond({ ok: true }, { compactKind: "raw" });
  },
};
