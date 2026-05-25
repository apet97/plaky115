// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getSpace
import { z } from "zod/v3";
import { getSpace } from "plaky115/operations/get-space.js";
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
    const result = await getSpace(input as Parameters<typeof getSpace>[0], ctx.requestOptions);
    return ctx.respond(result, { compactKind: "space" });
  },
};
