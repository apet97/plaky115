// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getSpace
import { z } from "zod/v3";
import { request } from "plaky115/runtime/http.js";
import type { McpToolDefinition } from "../../runtime/types.js";

const args = z.object({
  spaceId: z.union([z.string(), z.number()]).describe("spaceId"),
});

export const getSpaceTool: McpToolDefinition = {
  name: "plaky_get_space",
  title: "Get space",
  description: "Retrieve a space",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: args,
  async handler(input, ctx) {
    const parsed = args.parse(input);
    const result = await request({
      method: "GET",
      path: `/v1/public/spaces/${encodeURIComponent(String(parsed.spaceId))}`,
      operationId: "getSpace",
    }, ctx.requestOptions);
    return ctx.respond(result, { compactKind: "space" });
  },
};
