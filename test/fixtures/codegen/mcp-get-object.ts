// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getWidget
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  widgetId: z.number().int().describe("Widget identifier."),
  status: z.enum(["OPEN","DONE"]).describe("Status filter.").optional(),
  limit: z.number().int().describe("Result limit.").optional(),
  labels: z.array(z.string()).describe("Labels to match.").optional(),
});
const output = z.object({}).passthrough();

export const getWidgetTool: McpToolDefinition = {
  name: "plaky_get_widget",
  title: "getWidget",
  description: "getWidget fixture",
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
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.limit !== undefined ? { limit: parsed.limit } : {}),
      ...(parsed.labels !== undefined ? { labels: parsed.labels } : {}),
    };
    const result = await request<Record<string, unknown>>({
      method: "GET",
      path: `/v1/widgets/${encodeURIComponent(String(parsed.widgetId))}`,
      query,
      operationId: "getWidget",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "item" });
  },
};
