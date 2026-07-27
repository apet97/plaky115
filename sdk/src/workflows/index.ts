import type { PlakyClient } from "../client/client.js";
import { resolveSpaceAndBoard, type EntityRef } from "../resolvers/index.js";
import { asSpaceId, asBoardId, asItemId } from "../runtime/ids.js";
import type { ItemShape } from "../client/shapes.js";
import { renderItemsCsv, type CsvSafety } from "./internal/csv.js";

type WithIdTitle = {
  id?: number | string | undefined;
  title?: string | undefined;
  name?: string | undefined;
  boards?: WithIdTitle[] | undefined;
};

export async function workspaceMap(client: PlakyClient): Promise<Array<{ id: number | string | undefined; title: string | undefined; boards: WithIdTitle[] }>> {
  const spaces = (await client.spaces.listAll({ expand: ["board"] })) as WithIdTitle[];
  const out = [];
  for (const space of spaces) {
    const boards = Array.isArray(space.boards)
      ? space.boards
      : space.id !== undefined
        ? ((await client.boards.listAll({ spaceId: asSpaceId(space.id) })) as WithIdTitle[])
        : [];
    out.push({ id: space.id, title: space.title, boards });
  }
  return out;
}

export type SearchItemsParams = {
  space: EntityRef;
  board: EntityRef;
  query: string;
  limit?: number;
};

export type SearchItemsDetailedResult = {
  data: ItemShape[];
  scanned: number;
  matched: number;
  truncated: boolean;
  nextPage?: number | undefined;
};

export async function searchItemsDetailed(client: PlakyClient, params: SearchItemsParams): Promise<SearchItemsDetailedResult> {
  const limit = params.limit ?? 200;
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) {
    throw new RangeError("limit must be a finite positive integer");
  }

  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
  const needle = params.query.toLowerCase();
  const data: ItemShape[] = [];
  let scanned = 0;

  for (let page = 1; scanned < limit; page++) {
    const response = await client.items.list({
      spaceId: asSpaceId(space.id!),
      boardId: asBoardId(board.id!),
      page,
      pageSize: Math.min(100, limit - scanned),
    });
    const items = (response.data ?? []) as ItemShape[];
    for (const item of items.slice(0, limit - scanned)) {
      scanned++;
      if (itemMatchesSearch(item, needle)) data.push(item);
    }

    if (response.hasMore !== true) {
      return { data, scanned, matched: data.length, truncated: false };
    }
    if (scanned >= limit) {
      return { data, scanned, matched: data.length, truncated: true, nextPage: page + 1 };
    }
    if (items.length === 0) {
      throw new Error(`item search page ${page} was empty while hasMore was true`);
    }
  }

  return { data, scanned, matched: data.length, truncated: false };
}

/** @deprecated Use {@link searchItemsDetailed} to observe scan completeness. */
export async function searchItems(client: PlakyClient, params: SearchItemsParams): Promise<ItemShape[]> {
  return (await searchItemsDetailed(client, params)).data;
}

function itemMatchesSearch(item: ItemShape, needle: string): boolean {
  if ((item.title ?? "").toLowerCase().includes(needle)) return true;
  return (item.fields ?? []).some((field) => searchableScalars(field?.value).some((value) => value.toLowerCase().includes(needle)));
}

function searchableScalars(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) return value.flatMap(searchableScalars);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .flatMap((key) => searchableScalars((value as Record<string, unknown>)[key]));
  }
  return [];
}

export type BulkUpdateParams = {
  space: EntityRef;
  board: EntityRef;
  updates: Array<{ itemId: number | string; body: Record<string, unknown> }>;
  dryRun?: boolean;
};

export async function bulkUpdateItems(client: PlakyClient, params: BulkUpdateParams): Promise<Array<{ itemId: number | string; status: "dry-run" | "updated" | "error"; detail?: unknown }>> {
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
  const out = [];
  for (const update of params.updates) {
    if (params.dryRun === true) {
      out.push({ itemId: update.itemId, status: "dry-run" as const });
      continue;
    }
    try {
      await client.items.updateFields({
        spaceId: asSpaceId(space.id!),
        boardId: asBoardId(board.id!),
        itemId: asItemId(update.itemId),
        body: update.body,
      });
      out.push({ itemId: update.itemId, status: "updated" as const });
    } catch (err) {
      out.push({ itemId: update.itemId, status: "error" as const, detail: (err as Error).message });
    }
  }
  return out;
}

export type ExportItemsParams = {
  space: EntityRef;
  board: EntityRef;
  format: "jsonl" | "csv";
  csvSafety?: CsvSafety | undefined;
};

export async function exportItems(client: PlakyClient, params: ExportItemsParams): Promise<string> {
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
  const items = (await client.items.listAll({ spaceId: asSpaceId(space.id!), boardId: asBoardId(board.id!) })) as Array<Record<string, unknown>>;
  if (params.format === "jsonl") {
    return items.map((i) => JSON.stringify(i)).join("\n");
  }
  return renderItemsCsv(items, params.csvSafety ?? "spreadsheet");
}
