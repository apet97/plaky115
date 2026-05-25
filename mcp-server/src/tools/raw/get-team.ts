// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getTeam
import { z } from "zod/v3";
import { getTeam } from "plaky115/operations/get-team.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  teamId: z.union([z.string(), z.number()]).describe("teamId"),
});

export const getTeamTool: McpToolDefinition = {
  name: "plaky_get_team",
  title: "Get team",
  description: "Retrieve a team",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const result = await getTeam(input as Parameters<typeof getTeam>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
