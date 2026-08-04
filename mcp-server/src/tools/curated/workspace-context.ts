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
    includeRaw: z.boolean().describe("Include raw payloads when they fit the independent raw-response bound.").optional(),
  }),
  outputSchema: z.object({
    data: z.array(z.unknown()),
    complete: z.boolean(),
    truncated: z.boolean(),
    value: z.array(z.unknown()).optional().describe("Deprecated 1.x compatibility alias for data."),
  }).passthrough(),
  async handler(input, ctx) {
    const { includeRaw } = input as { includeRaw?: boolean };
    const map = await workspaceMap(ctx.client, { signal: ctx.signal });
    return ctx.respond(map, { compactKind: "workspace", includeRaw: includeRaw === true });
  },
};
