// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=archiveWidget
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  widgetId: z.string().describe("Widget identifier."),
});
const output = z.object({ ok: z.boolean() });

export const archiveWidgetTool: McpToolDefinition = {
  name: "plaky_archive_widget",
  title: "archiveWidget",
  description: "archiveWidget fixture",
  scopes: ["write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    await request<void>({
      method: "PUT",
      path: `/v1/widgets/${encodeURIComponent(String(parsed.widgetId))}/archive`,
      responseType: "void",
      operationId: "archiveWidget",
    }, ctx.requestOptions);
    return ctx.respond({ ok: true }, { compactKind: "raw" });
  },
};
