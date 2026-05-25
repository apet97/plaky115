// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listTeams
import { z } from "zod/v3";
import { listTeams } from "plaky115/operations/list-teams.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(200).optional(),
});

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
  async handler(input, ctx) {
    const result = await listTeams(input as Parameters<typeof listTeams>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
