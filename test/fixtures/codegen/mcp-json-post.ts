// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createWidget
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  body: z.record(z.unknown()).describe("JSON request body for createWidget fixture."),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

export const createWidgetTool: McpToolDefinition = {
  name: "plaky_create_widget",
  title: "createWidget",
  description: "createWidget fixture",
  scopes: ["write"],
  sensitiveOutput: false,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request<Record<string, unknown>>({
      method: "POST",
      path: "/v1/widgets",
      body: parsed.body,
      operationId: "createWidget",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "raw" });
  },
};
