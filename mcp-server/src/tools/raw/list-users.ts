// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listUsers
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  emails: z.array(z.string()).describe("If provided, you will get list of users filtered for the provided emails").optional(),
  status: z.enum(["ACTIVE","PENDING","INACTIVE"]).describe("If provided, you will get list of users filtered for the provided status").optional(),
  type: z.enum(["OWNER","ADMIN","MEMBER","VIEWER"]).describe("If provided, you will get list of users filtered for the provided type").optional(),
  page: z.number().int().describe("Page number.").optional(),
  pageSize: z.number().int().describe("Page size.").optional(),
});
const output = z.object({}).passthrough();

export const listUsersTool: McpToolDefinition = {
  name: "plaky_list_users",
  title: "List users",
  description: "List workspace users",
  scopes: ["read"],
  sensitiveOutput: false,
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
      ...(parsed.emails !== undefined ? { emails: parsed.emails } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.type !== undefined ? { type: parsed.type } : {}),
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: "/v1/public/users",
      query,
      operationId: "listUsers",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
