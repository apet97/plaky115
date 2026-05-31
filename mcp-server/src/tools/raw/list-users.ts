// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listUsers
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  page: z.number().int().min(1).describe("One-based result page to request.").optional(),
  pageSize: z.number().int().min(1).max(200).describe("Maximum number of records to return for this page.").optional(),
});
const output = z.object({}).passthrough();

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
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const query = {
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request({
      method: "GET",
      path: "/v1/public/users",
      query,
      operationId: "listUsers",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
