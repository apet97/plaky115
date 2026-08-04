import type { PlakyClient } from "../client/client.js";
import { resolveSpaceAndBoard, type EntityRef } from "../resolvers/index.js";
import { asSpaceId, asBoardId, asItemId } from "../runtime/ids.js";
import { idPathSegment } from "../client/path.js";
import {
  PlakyPartialMutationError,
  freezeMutationReceipt,
  freezeMutationReceipts,
  mutationErrorSummary,
  type MutationErrorSummary,
  type MutationPhase,
  type MutationReceipt,
  type MutationReceiptStatus,
} from "../runtime/mutations.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { ItemShape } from "../client/shapes.js";
import { renderItemsCsv, type CsvSafety } from "./internal/csv.js";

type WithIdTitle = {
  id?: number | string | undefined;
  title?: string | undefined;
  name?: string | undefined;
  boards?: WithIdTitle[] | undefined;
};

export async function workspaceMap(client: PlakyClient, options?: ResourceRequestOverrides): Promise<Array<{ id: number | string | undefined; title: string | undefined; boards: WithIdTitle[] }>> {
  const spaces = (await client.spaces.listAll({ expand: ["board"] }, options)) as WithIdTitle[];
  const out = [];
  for (const space of spaces) {
    const boards = Array.isArray(space.boards)
      ? space.boards
      : space.id !== undefined
        ? ((await client.boards.listAll({ spaceId: asSpaceId(space.id) }, options)) as WithIdTitle[])
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
  signal?: AbortSignal;
  onProgress?: (scanned: number, limit: number) => void | Promise<void>;
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

  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  const needle = params.query.toLowerCase();
  const data: ItemShape[] = [];
  let scanned = 0;

  for (let page = 1; scanned < limit; page++) {
    const response = await client.items.list({
      spaceId: asSpaceId(space.id!),
      boardId: asBoardId(board.id!),
      page,
      pageSize: Math.min(100, limit - scanned),
    }, params.signal ? { signal: params.signal } : undefined);
    const items = response.data;
    for (const item of items.slice(0, limit - scanned)) {
      scanned++;
      if (itemMatchesSearch(item, needle)) data.push(item);
    }
    await params.onProgress?.(scanned, limit);

    if (!response.hasMore) {
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
  throwOnError?: boolean;
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void | Promise<void>;
};

export async function bulkUpdateItems(client: PlakyClient, params: BulkUpdateParams): Promise<readonly MutationReceipt[]> {
  const itemIds = validateBulkUpdates(params.updates);
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  const spaceId = canonicalResolvedId(space.id, "space");
  const boardId = canonicalResolvedId(board.id, "board");
  let receipts = params.updates.map((_, index) => freezeMutationReceipt({
    operation: "items.updateFields",
    index,
    status: "planned",
    attempted: false,
    mayHaveCommitted: false,
    phase: "preflight",
    targetIds: { spaceId, boardId, itemId: itemIds[index]! },
  }));

  if (params.signal?.aborted) {
    throw partialMutation("Bulk item update was aborted before the first write.", receipts, 0, params.signal.reason);
  }

  for (const [index, update] of params.updates.entries()) {
    if (params.signal?.aborted) {
      throw partialMutation("Bulk item update was aborted before the next write.", receipts, index, params.signal.reason);
    }
    if (params.dryRun === true) {
      await reportBulkProgress(params, index, receipts);
      continue;
    }
    receipts[index] = transitionReceipt(receipts[index]!, "request-started", "request");
    try {
      await client.items.updateFields({
        spaceId: asSpaceId(spaceId),
        boardId: asBoardId(boardId),
        itemId: asItemId(itemIds[index]!),
        body: update.body,
      }, params.signal ? { signal: params.signal } : undefined);
      receipts[index] = transitionReceipt(receipts[index]!, "completed", "completed");
    } catch (err) {
      receipts[index] = transitionReceipt(receipts[index]!, "ambiguous", "response", mutationErrorSummary(err));
      if (params.throwOnError === true) {
        throw partialMutation("Bulk item update has an unconfirmed mutation outcome.", receipts, index, err);
      }
    }
    await reportBulkProgress(params, index, receipts);
  }
  return freezeMutationReceipts(receipts);
}

function validateBulkUpdates(updates: BulkUpdateParams["updates"]): string[] {
  if (!Array.isArray(updates)) throw new TypeError("updates must be an array");
  return updates.map((update, index) => {
    if (update === null || typeof update !== "object") throw new TypeError(`updates[${index}] must be an object`);
    const candidate = update as { itemId?: unknown; body?: unknown };
    if (typeof candidate.itemId !== "string" && typeof candidate.itemId !== "number") {
      throw new TypeError(`updates[${index}].itemId must be a number or decimal string`);
    }
    if (!isPlainRecord(candidate.body)) throw new TypeError(`updates[${index}].body must be a plain object`);
    return idPathSegment(candidate.itemId);
  });
}

function canonicalResolvedId(value: number | string | undefined, label: string): string {
  if (value === undefined) throw new Error(`${label} resolver returned no ID`);
  return idPathSegment(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function transitionReceipt(
  receipt: MutationReceipt,
  status: MutationReceiptStatus,
  phase: MutationPhase,
  error?: MutationErrorSummary,
): MutationReceipt {
  return freezeMutationReceipt({
    operation: receipt.operation,
    index: receipt.index,
    status,
    attempted: status !== "planned",
    mayHaveCommitted: status === "ambiguous" || status === "request-started",
    phase,
    targetIds: receipt.targetIds,
    ...(error === undefined ? {} : { error }),
  });
}

async function reportBulkProgress(params: BulkUpdateParams, index: number, receipts: readonly MutationReceipt[]): Promise<void> {
  try {
    await params.onProgress?.(index + 1, params.updates.length);
  } catch (error) {
    throw partialMutation("Bulk item update progress reporting failed.", receipts, index, error);
  }
}

function partialMutation(message: string, receipts: readonly MutationReceipt[], failedIndex: number, cause: unknown): PlakyPartialMutationError {
  return new PlakyPartialMutationError(message, receipts, { cause, failedIndex });
}

export type ExportItemsParams = {
  space: EntityRef;
  board: EntityRef;
  format: "jsonl" | "csv";
  csvSafety?: CsvSafety | undefined;
  signal?: AbortSignal | undefined;
};

export async function exportItems(client: PlakyClient, params: ExportItemsParams): Promise<string> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  const items = (await client.items.listAll({ spaceId: asSpaceId(space.id!), boardId: asBoardId(board.id!) }, requestOptions)) as Array<Record<string, unknown>>;
  if (params.format === "jsonl") {
    return items.map((i) => JSON.stringify(i)).join("\n");
  }
  return renderItemsCsv(items, params.csvSafety ?? "spreadsheet");
}
