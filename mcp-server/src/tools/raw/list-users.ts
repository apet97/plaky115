// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listUsers
import { z } from "zod/v3";
import { listUsers } from "plaky115/operations/list-users.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

export const listUsersTool: McpToolDefinition = {
  name: "plaky_list_users",
  title: "List users",
  description: "List workspace users",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await listUsers(input as Parameters<typeof listUsers>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
