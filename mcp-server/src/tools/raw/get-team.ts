// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getTeam
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  teamId: z.union([z.string(), z.number()]).describe("teamId"),
});
const output = z.object({}).passthrough();

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
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "GET",
      path: `/v1/public/teams/${encodeURIComponent(String(parsed.teamId))}`,
      operationId: "getTeam",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
