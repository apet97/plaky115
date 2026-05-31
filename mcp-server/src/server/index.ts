import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { PlakyApiError, PlakyClient, PlakyError } from "plaky115";
import { selectTools, type Mode } from "./modes.js";
import { filterByScopes } from "./scopes.js";
import { compactByKind, serializeForMcp, structuredForMcp } from "../runtime/compaction.js";
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
          const structuredContent = structuredForMcp(compacted);
          return {
            content: [{ type: "text", text: serializeForMcp(structuredContent) }],
            structuredContent,
          };
        },
        progress: () => {
          /* no-op for now */
        },
      };
      try {
        const result = await tool.handler(input, ctx);
        if (isMcpResponse(result)) return result;
        return ctx.respond(result);
      } catch (error) {
        if (isKnownToolError(error)) return errorResponse(error);
        throw error;
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server as any).registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: tool.annotations,
      },
      handler,
    );
  }
  installStrictCallToolHandler(server);

  return { server, tools };
}

function installStrictCallToolHandler(server: McpServer): void {
  const rawServer = (server as any).server;
  const handlers = rawServer._requestHandlers as Map<string, (request: unknown, extra: unknown) => Promise<unknown>>;
  const original = handlers.get("tools/call");
  if (original === undefined) throw new Error("MCP tools/call handler was not initialized");
  handlers.set("tools/call", (request: any, extra: unknown) => {
    const tool = (server as any)._registeredTools[request.params.name];
    if (!tool) {
      throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} not found`);
    }
    if (!tool.enabled) {
      throw new McpError(ErrorCode.InvalidParams, `Tool ${request.params.name} disabled`);
    }
    return original(request, extra);
  });
}

function isMcpResponse(value: unknown): value is McpToolResponse {
  return typeof value === "object" && value !== null && "content" in value && Array.isArray((value as McpToolResponse).content);
}

function isKnownToolError(error: unknown): error is PlakyError {
  return error instanceof PlakyError;
}

function errorResponse(error: PlakyError): McpToolResponse {
  const payload: Record<string, unknown> = {
    error: {
      name: error.name,
      message: error.message,
      ...(error instanceof PlakyApiError
        ? {
            status: error.status,
            requestId: error.requestId,
            code: error.code,
            retryAfterMs: error.retryAfterMs,
          }
        : {}),
    },
  };
  const structuredContent = structuredForMcp(payload);
  return {
    content: [{ type: "text", text: serializeForMcp(structuredContent) }],
    structuredContent,
    isError: true,
  };
}

export type { Mode, McpScope, McpToolDefinition };
