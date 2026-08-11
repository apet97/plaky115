import type { PlakyClient } from "../client/client.js";
import { resolveSpaceAndBoard, type EntityRef } from "../resolvers/index.js";
import { asSpaceId, asBoardId, asItemId } from "../runtime/ids.js";
import { idPathSegment } from "../client/path.js";
import {
  DEFAULT_CHUNK_MAX_BYTES,
  DEFAULT_CHUNK_MAX_ITEMS,
  MAX_MATERIALIZED_BYTES,
  MAX_MATERIALIZED_ITEMS,
  PlakyMaterializationLimitError,
  iteratePagedChunks,
  readPagedChunk,
  utf8ByteLength,
  type BoundedChunk,
  type PageCursor,
} from "../runtime/chunks.js";
import { assertPagedResult, type Page } from "../runtime/pagination.js";
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
import { createItemsCsvSchema, renderItemsCsv, renderItemsCsvChunk, type CsvSafety, type CsvSchema } from "./internal/csv.js";

type WithIdTitle = {
  id?: number | string | undefined;
  title?: string | undefined;
  name?: string | undefined;
  boards?: WithIdTitle[] | undefined;
};

export async function workspaceMap(client: PlakyClient, options?: WorkspaceMapOptions): Promise<Array<{ id: number | string | undefined; title: string | undefined; boards: WithIdTitle[] }>> {
  const { maxItems: requestedMaxItems, maxBytes: requestedMaxBytes, ...requestOptions } = options ?? {};
  const maxItems = requestedMaxItems ?? MAX_MATERIALIZED_ITEMS;
  const maxBytes = requestedMaxBytes ?? MAX_MATERIALIZED_BYTES;
  assertNonNegativeSafeInteger(maxItems, "maxItems");
  assertNonNegativeSafeInteger(maxBytes, "maxBytes");
  const spaces = (await client.spaces.listAll({ expand: ["board"], limit: maxItems + 1 }, requestOptions)) as WithIdTitle[];
  assertMaterializedCollection(spaces, maxItems, maxBytes);
  const out = [];
  let outputBytes = 0;
  for (const space of spaces) {
    const boards = Array.isArray(space.boards)
      ? space.boards
      : space.id !== undefined
        ? ((await client.boards.listAll({ spaceId: asSpaceId(space.id), limit: maxItems + 1 }, requestOptions)) as WithIdTitle[])
        : [];
    assertMaterializedCollection(boards, maxItems, maxBytes);
    const entry = { id: space.id, title: space.title, boards };
    outputBytes += utf8ByteLength(JSON.stringify(entry));
    if (outputBytes > maxBytes) {
      throw new PlakyMaterializationLimitError("bytes", maxBytes);
    }
    out.push(entry);
  }
  return out;
}

export type WorkspaceMapOptions = ResourceRequestOverrides & {
  maxItems?: number | undefined;
  maxBytes?: number | undefined;
};

export type SearchItemsParams = {
  space: EntityRef;
  board: EntityRef;
  query: string;
  limit?: number;
  cursor?: PageCursor | undefined;
  signal?: AbortSignal;
  onProgress?: (scanned: number, limit: number) => void | Promise<void>;
};

export type SearchItemsDetailedResult = {
  data: ItemShape[];
  scanned: number;
  matched: number;
  complete: boolean;
  truncated: boolean;
  continuation?: PageCursor | undefined;
  /** @deprecated Use `continuation.page`. */
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

  let page = params.cursor?.page ?? 1;
  let index = params.cursor?.index ?? 0;
  if (!Number.isSafeInteger(page) || page <= 0 || !Number.isSafeInteger(index) || index < 0) {
    throw new RangeError("cursor must contain a positive page and non-negative index");
  }

  while (scanned < limit) {
    const response = await client.items.list({
      spaceId: asSpaceId(space.id!),
      boardId: asBoardId(board.id!),
      page,
      pageSize: Math.min(100, limit - scanned),
    }, params.signal ? { signal: params.signal } : undefined);
    const items = response.data;
    if (index > items.length) throw new Error(`item search cursor index ${index} exceeds page ${page} length`);
    const startIndex = index;
    const pageItems = items.slice(startIndex, startIndex + limit - scanned);
    for (const item of pageItems) {
      scanned++;
      if (itemMatchesSearch(item, needle)) data.push(item);
    }
    await params.onProgress?.(scanned, limit);

    // Compute the continuation from the number of records actually examined;
    // this remains exact even if a test transport returns more records than its
    // requested page size.
    const pageIndex = startIndex + pageItems.length;
    const pageHasUnconsumedItems = pageIndex < items.length;
    if (scanned >= limit && (response.hasMore || pageHasUnconsumedItems)) {
      const continuation = { page, index: pageIndex } satisfies PageCursor;
      return {
        data,
        scanned,
        matched: data.length,
        complete: false,
        truncated: true,
        continuation,
        nextPage: pageIndex >= items.length ? page + 1 : page,
      };
    }
    if (!response.hasMore) {
      return { data, scanned, matched: data.length, complete: true, truncated: false };
    }
    if (items.length === 0) {
      throw new Error(`item search page ${page} was empty while hasMore was true`);
    }
    page++;
    index = 0;
  }

  return { data, scanned, matched: data.length, complete: false, truncated: true, continuation: { page, index }, nextPage: page };
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
  maxItems?: number | undefined;
  maxBytes?: number | undefined;
};

export async function exportItems(client: PlakyClient, params: ExportItemsParams): Promise<string> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  const maxItems = params.maxItems ?? MAX_MATERIALIZED_ITEMS;
  const maxBytes = params.maxBytes ?? MAX_MATERIALIZED_BYTES;
  assertNonNegativeSafeInteger(maxItems, "maxItems");
  assertNonNegativeSafeInteger(maxBytes, "maxBytes");
  const items = (await client.items.listAll({
    spaceId: asSpaceId(space.id!),
    boardId: asBoardId(board.id!),
    limit: maxItems + 1,
  }, requestOptions)) as Array<Record<string, unknown>>;
  assertMaterializedCollection(items, maxItems, maxBytes);
  if (params.format === "jsonl") {
    let output = "";
    let outputBytes = 0;
    for (const item of items) {
      const line = JSON.stringify(item);
      const lineBytes = utf8ByteLength(line);
      const separatorBytes = output === "" ? 0 : 1;
      if (outputBytes + separatorBytes + lineBytes > maxBytes) {
        throw new PlakyMaterializationLimitError("bytes", maxBytes);
      }
      output += output === "" ? line : `\n${line}`;
      outputBytes += separatorBytes + lineBytes;
    }
    return output;
  }
  const output = renderItemsCsv(items, params.csvSafety ?? "spreadsheet");
  if (utf8ByteLength(output) > maxBytes) throw new PlakyMaterializationLimitError("bytes", maxBytes);
  return output;
}

export type ItemChunkParams = {
  space: EntityRef;
  board: EntityRef;
  pageSize?: number | undefined;
  maxItems?: number | undefined;
  maxBytes?: number | undefined;
  cursor?: PageCursor | undefined;
  signal?: AbortSignal | undefined;
};

export type ItemExportChunk = {
  format: "jsonl" | "csv";
  body: string;
  scanned: number;
  returned: number;
  bytes: number;
  complete: boolean;
  truncated: boolean;
  nextCursor?: PageCursor | undefined;
};

export type ItemExportChunkParams = ExportItemsParams & {
  pageSize?: number | undefined;
  cursor?: PageCursor | undefined;
};

/** Read one bounded item chunk. The returned cursor resumes at the first omitted item. */
export async function readItemChunk(client: PlakyClient, params: ItemChunkParams): Promise<BoundedChunk<ItemShape>> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  return readPagedChunk(itemPageFetcher(client, space.id!, board.id!, params.signal), {
    pageSize: params.pageSize,
    maxItems: params.maxItems,
    maxBytes: params.maxBytes,
    cursor: params.cursor,
    signal: params.signal,
  });
}

/** Lazily iterate item chunks; stopping the iterator prevents future page calls. */
export async function* iterateItemChunks(client: PlakyClient, params: ItemChunkParams): AsyncIterableIterator<BoundedChunk<ItemShape>> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  yield* iteratePagedChunks(itemPageFetcher(client, space.id!, board.id!, params.signal), {
    pageSize: params.pageSize,
    maxItems: params.maxItems,
    maxBytes: params.maxBytes,
    cursor: params.cursor,
    signal: params.signal,
  });
}

/** Read one bounded JSONL or CSV export chunk with a resumable cursor. */
export async function readItemExportChunk(client: PlakyClient, params: ItemExportChunkParams): Promise<ItemExportChunk> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const resolved = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  const csvState = params.format === "csv" ? await createCsvExportState(client, resolved.space.id!, resolved.board.id!, params) : undefined;
  return readResolvedExportChunk(client, resolved.space.id!, resolved.board.id!, params, params.cursor, true, csvState);
}

/** Lazily iterate bounded export chunks; each yielded chunk is independently continuable. */
export async function* iterateItemExportChunks(client: PlakyClient, params: ItemExportChunkParams): AsyncIterableIterator<ItemExportChunk> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const resolved = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, requestOptions);
  const csvState = params.format === "csv" ? await createCsvExportState(client, resolved.space.id!, resolved.board.id!, params) : undefined;
  let cursor = params.cursor;
  let first = true;
  while (true) {
    const chunk = await readResolvedExportChunk(client, resolved.space.id!, resolved.board.id!, params, cursor, first, csvState);
    yield chunk;
    if (chunk.nextCursor === undefined) return;
    cursor = chunk.nextCursor;
    first = false;
  }
}

type CsvExportState = {
  schema: CsvSchema;
  header: string;
  initialPage: number;
  cachedPage: Page<ItemShape>;
};

async function createCsvExportState(
  client: PlakyClient,
  spaceId: number | string,
  boardId: number | string,
  params: ItemExportChunkParams,
): Promise<CsvExportState> {
  const requestOptions = params.signal ? { signal: params.signal } : undefined;
  const pageSize = params.pageSize ?? 100;
  const initialPage = params.cursor?.page ?? 1;
  const board = await client.boards.get({ spaceId: asSpaceId(spaceId), boardId: asBoardId(boardId) }, requestOptions);
  const response = await client.items.list({
    spaceId: asSpaceId(spaceId),
    boardId: asBoardId(boardId),
    page: initialPage,
    pageSize,
  }, requestOptions);
  const checked = assertPagedResult<ItemShape>(response, "exportItemsCsv");
  const boardRecord = board as unknown as Record<string, unknown>;
  const definitions = Array.isArray(boardRecord["fields"])
    ? boardRecord["fields"] as Array<Record<string, unknown>>
    : [];
  const schema = createItemsCsvSchema(checked.data as Array<Record<string, unknown>>, definitions);
  return {
    schema,
    header: renderItemsCsvChunk([], params.csvSafety ?? "spreadsheet", schema, true),
    initialPage,
    cachedPage: { data: checked.data, hasMore: checked.hasMore, raw: response },
  };
}

async function readResolvedExportChunk(
  client: PlakyClient,
  spaceId: number | string,
  boardId: number | string,
  params: ItemExportChunkParams,
  cursor: PageCursor | undefined,
  includeHeader: boolean,
  csvState: CsvExportState | undefined,
): Promise<ItemExportChunk> {
  const baseFetcher = itemPageFetcher(client, spaceId, boardId, params.signal);
  if (params.format === "jsonl") {
    const chunk = await readPagedChunk(baseFetcher, {
      pageSize: params.pageSize,
      maxItems: params.maxItems,
      maxBytes: params.maxBytes,
      cursor,
      signal: params.signal,
      serialize: (item) => `${JSON.stringify(item)}\n`,
    });
    return {
      format: "jsonl",
      body: chunk.data.map((item) => `${JSON.stringify(item)}\n`).join(""),
      scanned: chunk.scanned,
      returned: chunk.returned,
      bytes: chunk.bytes,
      complete: chunk.complete,
      truncated: chunk.truncated,
      ...(chunk.nextCursor === undefined ? {} : { nextCursor: chunk.nextCursor }),
    };
  }

  if (csvState === undefined) throw new Error("CSV export schema was not prepared");
  const maxBytes = params.maxBytes ?? DEFAULT_CHUNK_MAX_BYTES;
  const headerBytes = includeHeader ? utf8ByteLength(csvState.header) : 0;
  if (headerBytes > maxBytes) throw new PlakyMaterializationLimitError("bytes", maxBytes);
  const chunk = await readPagedChunk(csvStateFetcher(baseFetcher, csvState), {
    pageSize: params.pageSize,
    maxItems: params.maxItems ?? DEFAULT_CHUNK_MAX_ITEMS,
    maxBytes: maxBytes - headerBytes,
    cursor,
    signal: params.signal,
    serialize: (item) => renderItemsCsvChunk([item as Record<string, unknown>], params.csvSafety ?? "spreadsheet", csvState.schema, false),
  });
  const rows = renderItemsCsvChunk(chunk.data as Array<Record<string, unknown>>, params.csvSafety ?? "spreadsheet", csvState.schema, false);
  const body = chunk.returned === 0 && chunk.complete && includeHeader ? "" : `${includeHeader ? csvState.header : ""}${rows}`;
  return {
    format: "csv",
    body,
    scanned: chunk.scanned,
    returned: chunk.returned,
    bytes: utf8ByteLength(body),
    complete: chunk.complete,
    truncated: chunk.truncated,
    ...(chunk.nextCursor === undefined ? {} : { nextCursor: chunk.nextCursor }),
  };
}

function csvStateFetcher(baseFetcher: ReturnType<typeof itemPageFetcher>, state: CsvExportState): ReturnType<typeof itemPageFetcher> {
  let cached: Page<ItemShape> | undefined = state.cachedPage;
  return async ({ page, pageSize }) => {
    if (cached !== undefined && page === state.initialPage) {
      const pageValue = cached;
      cached = undefined;
      return pageValue;
    }
    return baseFetcher({ page, pageSize });
  };
}

function itemPageFetcher(client: PlakyClient, spaceId: number | string, boardId: number | string, signal: AbortSignal | undefined) {
  return async ({ page, pageSize }: { page: number; pageSize: number }): Promise<Page<ItemShape>> => {
    const response = await client.items.list({
      spaceId: asSpaceId(spaceId),
      boardId: asBoardId(boardId),
      page,
      pageSize,
    }, signal ? { signal } : undefined);
    return { data: response.data, hasMore: response.hasMore, raw: response };
  };
}

function assertMaterializedCollection(items: readonly unknown[], maxItems: number, maxBytes: number): void {
  if (items.length > maxItems) throw new PlakyMaterializationLimitError("items", maxItems);
  let bytes = 0;
  for (const item of items) {
    bytes += utf8ByteLength(JSON.stringify(item) ?? "null");
    if (bytes > maxBytes) throw new PlakyMaterializationLimitError("bytes", maxBytes);
  }
}

function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer.`);
}
