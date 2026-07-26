// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSpaces
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  expand: z.array(z.enum(["board"])).describe("Comma-separated list of relationships to be expanded into full objects.").optional(),
  page: z.number().int().describe("Page number.").optional(),
  pageSize: z.number().int().describe("Page size.").optional(),
});
const output = z.object({}).passthrough();

export const listSpacesTool: McpToolDefinition = {
  name: "plaky_list_spaces",
  title: "List spaces",
  description: "List workspace spaces",
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
      ...(parsed.expand !== undefined ? { expand: parsed.expand } : {}),
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: "/v1/public/spaces",
      query,
      operationId: "listSpaces",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "space" });
  },
};
