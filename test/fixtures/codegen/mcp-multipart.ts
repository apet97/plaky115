// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=uploadWidgetFile
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { buildFileUploadFormData } from "../../runtime/upload.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  widgetId: z.string().describe("Widget identifier."),
  fileBase64: z.string().describe("Canonical base64 file content; decoded size is bounded before upload."),
  fileName: z.string().min(1).describe("File name sent in the multipart upload."),
  contentType: z.string().describe("Optional file media type, such as application/pdf.").optional(),
}).strict();
const output = z.object({}).passthrough();
const rawOutput = z.object({}).passthrough();

export const uploadWidgetFileTool: McpToolDefinition = {
  name: "plaky_upload_widget_file",
  title: "uploadWidgetFile",
  description: "uploadWidgetFile fixture",
  scopes: ["write"],
  sensitiveOutput: true,
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
    const body = buildFileUploadFormData({
      fileBase64: parsed.fileBase64,
      fileName: parsed.fileName,
      ...(parsed.contentType !== undefined ? { contentType: parsed.contentType } : {}),
    });
    const result = await ctx.attempt.mutate({
      operation: "uploadWidgetFile",
      targetIds: { widgetId: String(parsed.widgetId) },
      run: async () => {
        const result = await request<Record<string, unknown>>({
          method: "POST",
          path: `/v1/widgets/${encodeURIComponent(String(parsed.widgetId))}/files`,
          body,
          operationId: "uploadWidgetFile",
        }, ctx.requestOptions);
        rawOutput.parse(result);
        return result;
      },
    });
    return ctx.respond(result, { compactKind: "itemFile" });
  },
};
