// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listTeams
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});
const output = z.object({}).passthrough();

export const listTeamsTool: McpToolDefinition = {
  name: "plaky_list_teams",
  title: "List teams",
  description: "List workspace teams",
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
      path: "/v1/public/teams",
      query,
      operationId: "listTeams",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
