// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteWidget
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  widgetId: z.string().describe("Widget identifier."),
}).strict();
const output = z.object({ ok: z.boolean() });

export const deleteWidgetTool: McpToolDefinition = {
  name: "plaky_delete_widget",
  title: "deleteWidget",
  description: "deleteWidget fixture",
  scopes: ["write","destructive"],
  sensitiveOutput: false,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  outputSchema: output,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    await ctx.attempt.mutate({
      operation: "deleteWidget",
      targetIds: { widgetId: String(parsed.widgetId) },
      run: async () => {
        await request<void>({
          method: "DELETE",
          path: `/v1/widgets/${encodeURIComponent(String(parsed.widgetId))}`,
          responseType: "void",
          operationId: "deleteWidget",
        }, ctx.requestOptions);
      },
    });
    return ctx.respond({ ok: true }, { compactKind: "raw" });
  },
};
