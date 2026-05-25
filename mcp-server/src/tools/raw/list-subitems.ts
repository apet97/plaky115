// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSubitems
import { z } from "zod/v3";
import { listSubitems } from "plaky115/operations/list-subitems.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
  boardId: z.union([z.string(), z.number()]).describe("boardId"),
  itemId: z.union([z.string(), z.number()]).describe("itemId"),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export const listSubitemsTool: McpToolDefinition = {
  name: "plaky_list_subitems",
  title: "List subitems",
  description: "List subitems",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await listSubitems(input as Parameters<typeof listSubitems>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
