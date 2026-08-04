import { z } from "zod/v3";
import { searchItemsDetailed, asSpaceId, resolveSpace, type EntityRef, type PageCursor } from "plaky115";
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
    limit: z.number().int().positive().describe("Maximum records to scan in this call.").optional(),
    cursor: z.object({ page: z.number().int().positive(), index: z.number().int().nonnegative() }).strict().describe("Exact page and zero-based index at which to continue.").optional(),
    includeRaw: z.boolean().describe("Include raw API payloads only when they fit the independent raw-response bound.").optional(),
  }),
  outputSchema: z.object({
    data: z.array(z.unknown()),
    scanned: z.number().int().nonnegative(),
    matched: z.number().int().nonnegative(),
    complete: z.boolean(),
    truncated: z.boolean(),
    continuation: z.object({ page: z.number().int().positive(), index: z.number().int().nonnegative() }).optional(),
    nextPage: z.number().int().positive().optional(),
  }).passthrough(),
  async handler(input, ctx) {
    const args = input as {
      type: "space" | "board" | "item";
      query: string;
      spaceId?: EntityRef;
      boardId?: EntityRef;
      limit?: number;
      cursor?: PageCursor;
      includeRaw?: boolean;
    };
    const limit = args.limit ?? 200;
    if (args.type === "space") {
      const result = await scanRecords(
        ({ page, pageSize }) => ctx.client.spaces.list({ page, pageSize }, { signal: ctx.signal }),
        args.query,
        limit,
        args.cursor,
        (space) => String(space.title ?? ""),
      );
      return ctx.respond(result, { compactKind: "space", includeRaw: args.includeRaw === true });
    }
    if (args.type === "board") {
      if (args.spaceId === undefined) throw new Error("plaky_find: spaceId required when type=board");
      const space = await resolveSpace(ctx.client, args.spaceId, { signal: ctx.signal });
      const result = await scanRecords(
        ({ page, pageSize }) => ctx.client.boards.list({ spaceId: asSpaceId(space.id!), page, pageSize }, { signal: ctx.signal }),
        args.query,
        limit,
        args.cursor,
        (board) => String(board.title ?? ""),
      );
      return ctx.respond(result, { compactKind: "board", includeRaw: args.includeRaw === true });
    }
    if (args.type === "item") {
      if (args.spaceId === undefined || args.boardId === undefined) {
        throw new Error("plaky_find: spaceId and boardId required when type=item");
      }
      const result = await searchItemsDetailed(ctx.client, {
        space: args.spaceId,
        board: args.boardId,
        query: args.query,
        limit,
        cursor: args.cursor,
        signal: ctx.signal,
      });
      return ctx.respond(result, { compactKind: "item", includeRaw: args.includeRaw === true });
    }
    throw new Error(`plaky_find: unsupported type ${String(args.type)}`);
  },
};

type SearchPage<T> = { data: T[]; hasMore: boolean };

async function scanRecords<T extends { title?: string | undefined }>(
  fetchPage: (cursor: { page: number; pageSize: number }) => Promise<SearchPage<T>>,
  query: string,
  limit: number,
  cursor: PageCursor | undefined,
  text: (value: T) => string,
): Promise<{
  data: T[];
  scanned: number;
  matched: number;
  complete: boolean;
  truncated: boolean;
  continuation?: PageCursor;
  nextPage?: number;
}> {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError("limit must be a positive safe integer");
  let page = cursor?.page ?? 1;
  let index = cursor?.index ?? 0;
  if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(index) || index < 0) {
    throw new RangeError("cursor must contain a positive page and non-negative index");
  }
  const needle = query.toLowerCase();
  const data: T[] = [];
  let scanned = 0;
  while (scanned < limit) {
    const response = await fetchPage({ page, pageSize: Math.min(100, limit - scanned) });
    if (!Array.isArray(response.data)) throw new Error("search page data must be an array");
    if (index > response.data.length) throw new Error(`search cursor index ${index} exceeds page ${page} length`);
    const pageItems = response.data.slice(index, index + limit - scanned);
    for (const item of pageItems) {
      scanned++;
      if (text(item).toLowerCase().includes(needle)) data.push(item);
    }
    const pageIndex = index + pageItems.length;
    if (scanned >= limit && (response.hasMore || pageIndex < response.data.length)) {
      const continuation = { page, index: pageIndex } satisfies PageCursor;
      return {
        data,
        scanned,
        matched: data.length,
        complete: false,
        truncated: true,
        continuation,
        nextPage: pageIndex >= response.data.length ? page + 1 : page,
      };
    }
    if (!response.hasMore) return { data, scanned, matched: data.length, complete: true, truncated: false };
    if (response.data.length === 0) throw new Error(`search page ${page} was empty while hasMore was true`);
    page++;
    index = 0;
  }
  return { data, scanned, matched: data.length, complete: false, truncated: true, continuation: { page, index }, nextPage: page };
}
