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
  PlakyPartialMutationError,
  PlakyTimeoutError,
  UploadValidationError,
  redact,
} from "plaky115";
import type { MutationReceipt } from "plaky115";
import { ZodError } from "zod/v3";
import { selectTools, UsageError, type Mode } from "./modes.js";
import { filterByScopes } from "./scopes.js";
import { compactByKind, serializeForMcp, structuredForMcp } from "../runtime/compaction.js";
import { createMutationAttempt, McpMutationAttemptError, type McpAttemptSnapshot } from "../runtime/attempts.js";
import { resolveMaxUploadBytes } from "../runtime/upload.js";
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
  resolveMaxUploadBytes();
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
    attempt: createMutationAttempt(),
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
      return toToolErrorResponse(error, tool.name, undefined, tool, request.params.arguments);
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
    if (error instanceof PlakyPartialMutationError || error instanceof McpMutationAttemptError) {
      ctx.attempt.record(error.receipts);
    }
    return toToolErrorResponse(error, tool.name, ctx.attempt.snapshot(), tool, input);
  }
}

function isMcpResponse(value: unknown): value is McpToolResponse {
  return typeof value === "object" && value !== null && "content" in value && Array.isArray((value as McpToolResponse).content);
}

export function toToolErrorResponse(
  error: unknown,
  _toolName?: string,
  attempt?: McpAttemptSnapshot,
  tool?: McpToolDefinition,
  input?: unknown,
): McpToolResponse {
  const detail = classifyToolError(error, _toolName, attempt, tool, input);
  if (detail === undefined) throw redactedError(error);
  const payload: McpToolErrorEnvelope = { error: detail };
  const structuredContent = structuredForMcp(payload) as McpToolErrorEnvelope;
  return {
    content: [{ type: "text", text: serializeForMcp(structuredContent) }],
    structuredContent,
    isError: true,
  };
}

function classifyToolError(
  error: unknown,
  _toolName?: string,
  attempt?: McpAttemptSnapshot,
  tool?: McpToolDefinition,
  input?: unknown,
): McpToolError | undefined {
  const state = resolveAttemptState(error, attempt, tool, input);
  const mayHaveCommitted = state?.mayHaveCommitted === true;
  if (error instanceof PlakyPartialMutationError || error instanceof McpMutationAttemptError) {
    return withAttemptDetails({
      category: "plaky",
      name: error.name,
      message: redact(error.message),
      retryable: false,
    }, state);
  }
  if (error instanceof PlakyApiError) {
    return withApiDetails(error, {
      category: "api",
      name: error.name,
      message: redact(error.message),
      retryable: !mayHaveCommitted && (error.status === 429 || error.status >= 500),
    }, state);
  }
  if (error instanceof PlakyTimeoutError) return plakyDetail("timeout", error, !mayHaveCommitted, state);
  if (error instanceof PlakyConnectionError) return plakyDetail("connection", error, !mayHaveCommitted, state);
  if (error instanceof PlakyDecodeError) {
    return withAttemptDetails({
      ...plakyDetail("decode", error, false),
      ...(error.status !== undefined ? { status: error.status } : {}),
      ...(error.requestId !== undefined ? { requestId: error.requestId } : {}),
    }, state);
  }
  if (error instanceof PlakyAbortError) return plakyDetail("abort", error, false, state);
  if (error instanceof UploadValidationError) {
    return withAttemptDetails({
      category: "validation",
      name: error.name,
      message: redact(error.message),
      retryable: false,
      code: error.code,
      path: error.path,
    }, state);
  }
  if (error instanceof PlakyError) return plakyDetail("plaky", error, false, state);
  if (error instanceof ZodError) {
    return withAttemptDetails({
      category: "validation",
      name: error.name,
      message: redact(formatZodError(error)),
      retryable: false,
    }, state);
  }
  if (error instanceof UsageError) {
    return { category: "usage", name: error.name, message: redact(error.message), retryable: false };
  }
  return undefined;
}

function plakyDetail(category: McpToolError["category"], error: PlakyError, retryable: boolean, state?: McpAttemptSnapshot): McpToolError {
  return withAttemptDetails({ category, name: error.name, message: redact(error.message), retryable }, state);
}

function withApiDetails(error: PlakyApiError, detail: McpToolError, state?: McpAttemptSnapshot): McpToolError {
  return withAttemptDetails({
    ...detail,
    status: error.status,
    ...(error.code !== undefined ? { code: error.code } : {}),
    ...(error.requestId !== undefined ? { requestId: error.requestId } : {}),
    ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}),
  }, state);
}

function withAttemptDetails(detail: McpToolError, state: McpAttemptSnapshot | undefined): McpToolError {
  if (state === undefined) return detail;
  return {
    ...detail,
    attempted: state.attempted,
    mayHaveCommitted: state.mayHaveCommitted,
    phase: state.phase,
    ...(state.receipts.length > 0 ? { receipts: state.receipts } : {}),
  };
}

function resolveAttemptState(
  error: unknown,
  attempt: McpAttemptSnapshot | undefined,
  tool: McpToolDefinition | undefined,
  input: unknown,
): McpAttemptSnapshot | undefined {
  if (attempt !== undefined && (attempt.attempted || attempt.receipts.length > 0)) return attempt;
  if (error instanceof PlakyPartialMutationError || error instanceof McpMutationAttemptError) {
    return snapshotFromReceipts(error.receipts);
  }
  // Generated mutation tools do not use the curated helper yet. Treat a known
  // post-call transport/API failure conservatively until their generated
  // wrappers carry the same invocation-local state.
  if (isMutationInvocation(tool, input) && isPostRequestFailure(error)) {
    return { attempted: true, mayHaveCommitted: true, phase: "response", receipts: Object.freeze([]) };
  }
  return undefined;
}

function snapshotFromReceipts(receipts: readonly MutationReceipt[]): McpAttemptSnapshot {
  return {
    attempted: receipts.some((receipt) => receipt.attempted),
    mayHaveCommitted: receipts.some((receipt) => receipt.mayHaveCommitted),
    phase: receipts.some((receipt) => receipt.status === "ambiguous" || receipt.status === "failed")
      ? "response"
      : receipts.some((receipt) => receipt.status === "request-started")
        ? "request"
        : receipts.some((receipt) => receipt.status === "completed")
          ? "completed"
          : "preflight",
    receipts,
  };
}

function isPostRequestFailure(error: unknown): boolean {
  return error instanceof PlakyApiError || error instanceof PlakyTimeoutError || error instanceof PlakyConnectionError
    || error instanceof PlakyDecodeError || error instanceof PlakyAbortError;
}

function isMutationInvocation(tool: McpToolDefinition | undefined, input: unknown): boolean {
  if (tool === undefined) return false;
  if (tool.name === "plaky_execute_mutation_workflow") return true;
  if (tool.name === "plaky_execute_workflow") {
    const workflowId = input !== null && typeof input === "object" ? (input as { workflowId?: unknown }).workflowId : undefined;
    return typeof workflowId === "string" && [
      "items.create", "items.updateFields", "comments.add", "itemGroups.create", "itemGroups.update", "itemFiles.upload", "itemFiles.update",
    ].includes(workflowId);
  }
  return [
    "plaky_create_item", "plaky_update_item_field", "plaky_update_item_fields", "plaky_delete_item",
    "plaky_create_item_comment", "plaky_update_item_comment", "plaky_delete_item_comment", "plaky_replace_comment_reactions",
    "plaky_create_item_group", "plaky_update_item_group", "plaky_delete_item_group", "plaky_archive_item_group",
    "plaky_upload_item_file", "plaky_update_item_file", "plaky_delete_item_file",
  ].includes(tool.name);
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "input"}: ${issue.message}`)
    .join("; ");
}

function redactedError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const safe = new Error(redact(message));
  safe.name = error instanceof Error ? error.name : "Error";
  return safe;
}

export type { McpToolError, McpToolErrorEnvelope, Mode, McpScope, McpToolDefinition };
