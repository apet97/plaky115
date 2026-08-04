// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItem
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import { int64Id } from "../../runtime/ids.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: int64Id.describe("Represents unique space identifier across the system."),
  boardId: int64Id.describe("Represents unique board identifier across the system."),
  body: z.record(z.unknown()).describe("JSON request body for Create an item."),
}).strict();
const output = z.object({ id: z.unknown() }).passthrough();
const rawOutput = z.object({ id: z.unknown() }).passthrough();

export const createItemTool: McpToolDefinition = {
  name: "plaky_create_item",
  title: "Create item",
  description: "Create an item",
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
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}/boards/${encodeURIComponent(String(parsed.boardId))}/items`,
      body: parsed.body,
      operationId: "createItem",
    }, ctx.requestOptions);
    rawOutput.parse(result);
    return ctx.respond(result, { compactKind: "item" });
  },
};
