import type { ZodTypeAny } from "zod/v3";
import type { PlakyClient, PlakyRequestOptions } from "plaky115";

export type McpScope = "read" | "write" | "destructive";
export type CompactKind = "raw" | "item" | "board" | "space" | "comment";

export type McpRespondOptions = {
  compactKind?: CompactKind;
  includeRaw?: boolean;
};

export type McpToolResponse = {
  content: Array<{ type: "text"; text: string }>;
};

export type McpToolContext = {
  client: PlakyClient;
  requestOptions: PlakyRequestOptions;
  respond(value: unknown, opts?: McpRespondOptions): McpToolResponse;
  progress(message: string, percent?: number): void;
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
  annotations: McpToolAnnotations;
  inputSchema: ZodTypeAny;
  handler: (input: unknown, ctx: McpToolContext) => Promise<unknown> | unknown;
};
