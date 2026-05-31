import { z } from "zod/v3";
import { workspaceMap } from "plaky115";
import type { McpToolDefinition } from "../../runtime/types.js";

export const workspaceContextTool: McpToolDefinition = {
  name: "plaky_workspace_context",
  title: "Map Plaky workspace",
  description: "Return compact spaces and board summaries for navigation. Use this before any item or comment workflow.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    includeRaw: z.boolean().describe("Include uncompressed workspace, space, and board payloads.").optional(),
  }),
  outputSchema: z.object({
    value: z.unknown(),
  }).passthrough(),
  async handler(input, ctx) {
    const { includeRaw } = input as { includeRaw?: boolean };
    const map = await workspaceMap(ctx.client);
    return ctx.respond(map, { compactKind: "raw", includeRaw: includeRaw === true });
  },
};
