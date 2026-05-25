// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getCurrentUser
import { z } from "zod/v3";
import { getCurrentUser } from "plaky115/operations/get-current-user.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
});

export const getCurrentUserTool: McpToolDefinition = {
  name: "plaky_get_current_user",
  title: "Get current user",
  description: "Retrieve current user",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await getCurrentUser(input as Parameters<typeof getCurrentUser>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
