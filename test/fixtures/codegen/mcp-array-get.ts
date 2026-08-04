// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listWidgetFiles
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  widgetId: z.string().describe("Widget identifier."),
}).strict();
const output = z.object({ data: z.array(z.unknown()) });
const rawOutput = z.array(z.unknown());

export const listWidgetFilesTool: McpToolDefinition = {
  name: "plaky_list_widget_files",
  title: "listWidgetFiles",
  description: "listWidgetFiles fixture",
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
    const result = await request<unknown[]>({
      method: "GET",
      path: `/v1/widgets/${encodeURIComponent(String(parsed.widgetId))}/files`,
      operationId: "listWidgetFiles",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "itemFile" });
  },
};
