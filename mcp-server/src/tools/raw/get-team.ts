// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getTeam
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  teamId: int64Id.describe("Represents unique team identifier across the system."),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

export const getTeamTool: McpToolDefinition = {
  name: "plaky_get_team",
  title: "Get team",
  description: "Retrieve a team",
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
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/teams/${encodeURIComponent(String(parsed.teamId))}`,
      operationId: "getTeam",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
