// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemGroup
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemGroupId: int64Id.describe("Represents unique item group identifier across the system."),
}).strict();
const output = z.object({ ok: z.boolean() });

export const deleteItemGroupTool: McpToolDefinition = {
  name: "plaky_delete_item_group",
  title: "Delete item group",
  description: "Delete an item group",
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
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/item-groups/${encodeURIComponent(String(parsed.itemGroupId))}`,
      responseType: "void",
      operationId: "deleteItemGroup",
    }, ctx.requestOptions);
    return ctx.respond({ ok: true }, { compactKind: "raw" });
  },
};
