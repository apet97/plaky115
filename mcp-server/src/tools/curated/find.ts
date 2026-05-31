import { z } from "zod/v3";
import { searchItems, asSpaceId, type EntityRef } from "plaky115";
import type { McpToolDefinition } from "../../runtime/types.js";

export const findTool: McpToolDefinition = {
  name: "plaky_find",
  title: "Find Plaky records",
  description: "Find spaces, boards, or items by text. For type=item, spaceId and boardId are required.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    type: z.enum(["space", "board", "item"]).describe("Record type to search."),
    query: z.string().min(1).describe("Case-insensitive text to match against names or titles."),
    spaceId: z.union([z.number().int(), z.string()]).describe("Space ID or title, required for board and item searches.").optional(),
    boardId: z.union([z.number().int(), z.string()]).describe("Board ID or title, required for item searches.").optional(),
    includeRaw: z.boolean().describe("Include full API payloads instead of compact records.").optional(),
  }),
  outputSchema: z.object({
    data: z.array(z.unknown()),
    hasMore: z.boolean().optional(),
  }).passthrough(),
  async handler(input, ctx) {
    const args = input as { type: "space" | "board" | "item"; query: string; spaceId?: EntityRef; boardId?: EntityRef; includeRaw?: boolean };
    if (args.type === "space") {
      const spaces = await ctx.client.spaces.listAll();
      const needle = args.query.toLowerCase();
      const matched = spaces.filter((s) => String(s.title ?? "").toLowerCase().includes(needle));
      return ctx.respond({ data: matched, hasMore: false }, { compactKind: "space", includeRaw: args.includeRaw === true });
    }
    if (args.type === "board") {
      if (args.spaceId === undefined) throw new Error("plaky_find: spaceId required when type=board");
      const boards = await ctx.client.boards.listAll({ spaceId: asSpaceId(args.spaceId as string | number) });
      const needle = args.query.toLowerCase();
      const matched = boards.filter((b) => String(b.title ?? "").toLowerCase().includes(needle));
      return ctx.respond({ data: matched, hasMore: false }, { compactKind: "board", includeRaw: args.includeRaw === true });
    }
    if (args.type === "item") {
      if (args.spaceId === undefined || args.boardId === undefined) {
        throw new Error("plaky_find: spaceId and boardId required when type=item");
      }
      const items = await searchItems(ctx.client, { space: args.spaceId, board: args.boardId, query: args.query });
      return ctx.respond({ data: items, hasMore: false }, { compactKind: "item", includeRaw: args.includeRaw === true });
    }
    throw new Error(`plaky_find: unsupported type ${String(args.type)}`);
  },
};
