// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=uploadItemFile
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import { buildFileUploadFormData } from "../../runtime/upload.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  itemId: int64Id.describe("Represents unique item identifier across the system."),
  fileBase64: z.string().describe("Canonical base64 file content; decoded size is bounded before upload."),
  fileName: z.string().min(1).describe("File name sent in the multipart upload."),
  contentType: z.string().describe("Optional file media type, such as application/pdf.").optional(),
}).strict();
const output = z.object({ id: z.unknown() }).passthrough();
const rawOutput = z.object({ id: z.unknown() }).passthrough();

export const uploadItemFileTool: McpToolDefinition = {
  name: "plaky_upload_item_file",
  title: "Upload item file",
  description: "Upload an item file",
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
    const body = buildFileUploadFormData({
      fileBase64: parsed.fileBase64,
      fileName: parsed.fileName,
      ...(parsed.contentType !== undefined ? { contentType: parsed.contentType } : {}),
    });
    const result = await request<Record<string, unknown>>({
      method: "POST",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items/${encodeURIComponent(String(parsed.itemId))}/files`,
      body,
      operationId: "uploadItemFile",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "itemFile" });
  },
};
