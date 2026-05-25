import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlakyClient } from "plaky115";
import { selectTools, type Mode } from "./modes.js";
import { filterByScopes } from "./scopes.js";
import { compactByKind, serializeForMcp } from "../runtime/compaction.js";
import type { McpScope, McpToolContext, McpToolDefinition, McpToolResponse } from "../runtime/types.js";

export type ServerOptions = {
  apiKey: string;
  serverURL?: string;
  mode: Mode;
  scopes: McpScope[];
};

export function buildServer(opts: ServerOptions): { server: McpServer; tools: McpToolDefinition[] } {
  const client = new PlakyClient({
    apiKey: opts.apiKey,
    ...(opts.serverURL ? { serverURL: opts.serverURL } : {}),
  });
  const tools = filterByScopes(selectTools(opts.mode), new Set(opts.scopes));
  const server = new McpServer({ name: "plaky115", version: "0.1.0" });

  for (const tool of tools) {
    const handler = async (input: unknown): Promise<McpToolResponse> => {
      const ctx: McpToolContext = {
        client,
        requestOptions: client.requestOptions(),
        respond(value, ro): McpToolResponse {
          const compacted = ro?.compactKind
            ? compactByKind(value, ro.compactKind, { includeRaw: ro.includeRaw === true })
            : value;
          return { content: [{ type: "text", text: serializeForMcp(compacted) }] };
        },
        progress: () => {
          /* no-op for now */
        },
      };
      const result = await tool.handler(input, ctx);
      if (isMcpResponse(result)) return result;
      return ctx.respond(result);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server as any).registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      handler,
    );
  }

  return { server, tools };
}

function isMcpResponse(value: unknown): value is McpToolResponse {
  return typeof value === "object" && value !== null && "content" in value && Array.isArray((value as McpToolResponse).content);
}

export type { Mode, McpScope, McpToolDefinition };
