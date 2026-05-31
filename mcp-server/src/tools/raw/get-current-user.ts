// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getCurrentUser
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
});
const output = z.object({}).passthrough();

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
  outputSchema: output,
  async handler(_input, ctx) {
    const result = await request({
      method: "GET",
      path: "/v1/public/users/me",
      operationId: "getCurrentUser",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
