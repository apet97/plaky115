// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getSpace
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  expand: z.array(z.enum(["board"])).describe("Comma-separated list of relationships to be expanded into full objects.").optional(),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

export const getSpaceTool: McpToolDefinition = {
  name: "plaky_get_space",
  title: "Get space",
  description: "Retrieve a space",
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
    const query = {
      ...(parsed.expand !== undefined ? { expand: parsed.expand } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}`,
      query,
      operationId: "getSpace",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "space" });
  },
};
