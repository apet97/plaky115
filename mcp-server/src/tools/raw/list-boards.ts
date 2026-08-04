// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listBoards
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  page: z.number().int().min(1).max(2147483647).describe("Page number.").optional(),
  pageSize: z.number().int().min(1).describe("Page size.").optional(),
}).strict();
const output = z.object({ data: z.array(z.unknown()), hasMore: z.boolean() }).passthrough();
const rawOutput = z.object({ data: z.array(z.unknown()), hasMore: z.boolean() }).passthrough();

export const listBoardsTool: McpToolDefinition = {
  name: "plaky_list_boards",
  title: "List boards",
  description: "List space boards",
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
      ...(parsed.page !== undefined ? { page: parsed.page } : {}),
      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards`,
      query,
      operationId: "listBoards",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "board" });
  },
};
