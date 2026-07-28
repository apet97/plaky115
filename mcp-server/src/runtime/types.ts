import type { ZodTypeAny } from "zod/v3";
import type { PlakyClient, PlakyRequestOptions } from "plaky115";

export type McpScope = "read" | "write" | "destructive";
export type CompactKind = "raw" | "item" | "board" | "space" | "comment" | "itemGroup" | "itemFile" | "downloadLink";

export type McpRespondOptions = {
  compactKind?: CompactKind;
  includeRaw?: boolean;
};

export type McpToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type McpToolErrorCategory = "api" | "timeout" | "connection" | "decode" | "abort" | "validation" | "usage" | "plaky";

export type McpToolError = {
  category: McpToolErrorCategory;
  name: string;
  message: string;
  retryable: boolean;
  status?: number;
  code?: string;
  requestId?: string;
  retryAfterMs?: number;
};

export type McpToolErrorEnvelope = {
  error: McpToolError;
};

export type McpToolContext = {
  client: PlakyClient;
  requestOptions: PlakyRequestOptions;
  signal: AbortSignal;
  respond(value: unknown, opts?: McpRespondOptions): McpToolResponse;
  progress(progress: number, total: number, message: string): Promise<void>;
};

export type McpToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
};

export type McpToolDefinition = {
  name: string;
  title: string;
  description: string;
  scopes: McpScope[];
  sensitiveOutput?: boolean;
  annotations: McpToolAnnotations;
  inputSchema: ZodTypeAny;
  outputSchema?: ZodTypeAny;
  handler: (input: unknown, ctx: McpToolContext) => Promise<unknown> | unknown;
};
