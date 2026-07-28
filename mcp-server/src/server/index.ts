import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { readFileSync } from "node:fs";
import {
  PlakyAbortError,
  PlakyApiError,
  PlakyClient,
  PlakyConnectionError,
  PlakyDecodeError,
  PlakyError,
  PlakyTimeoutError,
  redact,
} from "plaky115";
import { ZodError } from "zod/v3";
import { selectTools, UsageError, type Mode } from "./modes.js";
import { filterByScopes } from "./scopes.js";
import { compactByKind, serializeForMcp, structuredForMcp } from "../runtime/compaction.js";
import type {
  McpScope,
  McpToolContext,
  McpToolDefinition,
  McpToolError,
  McpToolErrorEnvelope,
  McpToolResponse,
} from "../runtime/types.js";

declare const PLAKY115_MCP_PACKAGE_VERSION: string | undefined;

function readPackageVersion(): string {
  const value = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version?: unknown };
  if (typeof value.version !== "string" || value.version.length === 0) throw new Error("MCP package version is missing");
  return value.version;
}

export const SERVER_VERSION = typeof PLAKY115_MCP_PACKAGE_VERSION === "string"
  ? PLAKY115_MCP_PACKAGE_VERSION
  : readPackageVersion();

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
  const server = new McpServer(
    { name: "plaky115", version: SERVER_VERSION },
    {
      instructions:
        "Unofficial, hand-crafted toolkit for the Plaky public API. Not affiliated with Plaky or CAKE.com. See SECURITY.md for API-key handling and the destructive-operation model.",
    },
  );

  const createContext = (extra: RequestHandlerExtra<ServerRequest, ServerNotification>): McpToolContext => ({
    client,
    requestOptions: client.requestOptions({ signal: extra.signal }),
    signal: extra.signal,
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
    async progress(progress, total, message) {
      const progressToken = extra._meta?.progressToken;
      if (progressToken === undefined) return;
      await extra.sendNotification({ method: "notifications/progress", params: { progressToken, progress, total, message } });
    },
  });

  for (const tool of tools) {
    const handler = (input: unknown, extra: RequestHandlerExtra<ServerRequest, ServerNotification>): Promise<McpToolResponse> =>
      invokeTool(tool, input, createContext(extra));
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.outputSchema !== undefined ? { outputSchema: tool.outputSchema } : {}),
        annotations: tool.annotations,
      },
      handler,
    );
  }

  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  server.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const tool = toolsByName.get(request.params.name);
    if (!tool) return toToolErrorResponse(new UsageError(`Tool ${request.params.name} not found.`));
    if (request.params.task !== undefined) {
      return toToolErrorResponse(new UsageError(`Tool ${request.params.name} does not support task execution.`));
    }

    let input: unknown;
    try {
      input = await tool.inputSchema.parseAsync(request.params.arguments ?? {});
    } catch (error) {
      return toToolErrorResponse(error, tool.name);
    }
    return invokeTool(tool, input, createContext(extra));
  });

  return { server, tools };
}

async function invokeTool(tool: McpToolDefinition, input: unknown, ctx: McpToolContext): Promise<McpToolResponse> {
  try {
    const result = await tool.handler(input, ctx);
    const response = isMcpResponse(result) ? result : ctx.respond(result);
    if (response.isError !== true && tool.outputSchema !== undefined) {
      if (response.structuredContent === undefined) {
        throw new Error(`Tool ${tool.name} returned no structured content.`);
      }
      const output = await tool.outputSchema.safeParseAsync(response.structuredContent);
      if (!output.success) throw new Error(`Tool ${tool.name} returned invalid structured content.`);
    }
    return response;
  } catch (error) {
    return toToolErrorResponse(error, tool.name);
  }
}

function isMcpResponse(value: unknown): value is McpToolResponse {
  return typeof value === "object" && value !== null && "content" in value && Array.isArray((value as McpToolResponse).content);
}

export function toToolErrorResponse(error: unknown, toolName?: string): McpToolResponse {
  const detail = classifyToolError(error, toolName);
  if (detail === undefined) throw redactedError(error);
  const payload: McpToolErrorEnvelope = { error: detail };
  const structuredContent = structuredForMcp(payload) as McpToolErrorEnvelope;
  return {
    content: [{ type: "text", text: serializeForMcp(structuredContent) }],
    structuredContent,
    isError: true,
  };
}

function classifyToolError(error: unknown, toolName?: string): McpToolError | undefined {
  if (error instanceof PlakyApiError) {
    return withApiDetails(error, {
      category: "api",
      name: error.name,
      message: redact(error.message),
      retryable: error.status === 429 || error.status >= 500,
    });
  }
  if (error instanceof PlakyTimeoutError) return plakyDetail("timeout", error, true);
  if (error instanceof PlakyConnectionError) return plakyDetail("connection", error, true);
  if (error instanceof PlakyDecodeError) {
    return {
      ...plakyDetail("decode", error, false),
      ...(error.status !== undefined ? { status: error.status } : {}),
      ...(error.requestId !== undefined ? { requestId: error.requestId } : {}),
    };
  }
  if (error instanceof PlakyAbortError) return plakyDetail("abort", error, false);
  if (error instanceof PlakyError) return plakyDetail("plaky", error, false);
  if (error instanceof ZodError) {
    return {
      category: "validation",
      name: error.name,
      message: redact(formatZodError(error)),
      retryable: false,
    };
  }
  if (error instanceof UsageError) {
    return { category: "usage", name: error.name, message: redact(error.message), retryable: false };
  }
  if (toolName === "plaky_upload_item_file" && isUploadValidationError(error)) {
    return {
      category: "validation",
      name: "UploadValidationError",
      message: redact(error.message),
      retryable: false,
    };
  }
  return undefined;
}

function plakyDetail(category: McpToolError["category"], error: PlakyError, retryable: boolean): McpToolError {
  return { category, name: error.name, message: redact(error.message), retryable };
}

function withApiDetails(error: PlakyApiError, detail: McpToolError): McpToolError {
  return {
    ...detail,
    status: error.status,
    ...(error.code !== undefined ? { code: error.code } : {}),
    ...(error.requestId !== undefined ? { requestId: error.requestId } : {}),
    ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}),
  };
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "input"}: ${issue.message}`)
    .join("; ");
}

function isUploadValidationError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return /(?:fileBase64|fileName|contentType|maxBytes|decoded upload|PLAKY115_MCP_MAX_UPLOAD_BYTES)/i.test(error.message);
}

function redactedError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const safe = new Error(redact(message));
  safe.name = error instanceof Error ? error.name : "Error";
  return safe;
}

export type { McpToolError, McpToolErrorEnvelope, Mode, McpScope, McpToolDefinition };
