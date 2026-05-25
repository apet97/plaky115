// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSpaces
import { z } from "zod/v3";
import { listSpaces } from "plaky115/operations/list-spaces.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export const listSpacesTool: McpToolDefinition = {
  name: "plaky_list_spaces",
  title: "List spaces",
  description: "List workspace spaces",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await listSpaces(input as Parameters<typeof listSpaces>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "space" });
  },
};
