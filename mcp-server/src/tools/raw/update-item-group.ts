// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemGroup
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemGroupId: int64Id.describe("Represents unique item group identifier across the system."),
  body: z.record(z.unknown()).superRefine((body, ctx) => { if (!Object.prototype.hasOwnProperty.call(body, "title")) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["title"], message: "required" }); if (!Object.prototype.hasOwnProperty.call(body, "ranking")) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ranking"], message: "required" }); if (!Object.prototype.hasOwnProperty.call(body, "color")) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["color"], message: "required" }); }).describe("JSON request body for Update an item group."),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

export const updateItemGroupTool: McpToolDefinition = {
  name: "plaky_update_item_group",
  title: "Update item group",
  description: "Update an item group",
  scopes: ["write"],
  sensitiveOutput: false,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request<Record<string, unknown>>({
      method: "PUT",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/item-groups/${encodeURIComponent(String(parsed.itemGroupId))}`,
      body: parsed.body,
      operationId: "updateItemGroup",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "itemGroup" });
  },
};
