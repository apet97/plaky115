import { PlakyResponseContractError } from "./errors.js";
import { assertPagedResult, type PageFetcher } from "./pagination.js";

export type PageCursor = {
  page: number;
  index: number;
};

export type BoundedChunk<T, TCursor = PageCursor> = {
  data: T[];
  scanned: number;
  returned: number;
  bytes: number;
  complete: boolean;
  truncated: boolean;
  nextCursor?: TCursor | undefined;
};

export type ChunkOptions<T, TCursor = PageCursor> = {
  pageSize?: number | undefined;
  maxItems?: number | undefined;
  maxBytes?: number | undefined;
  cursor?: TCursor | undefined;
  signal?: AbortSignal | undefined;
  serialize?: ((value: T) => string) | undefined;
};

export type ChunkIterator<T, TCursor = PageCursor> = AsyncIterableIterator<BoundedChunk<T, TCursor>>;

export const DEFAULT_CHUNK_MAX_ITEMS = 100;
export const DEFAULT_CHUNK_MAX_BYTES = 1_048_576;
export const MAX_MATERIALIZED_ITEMS = 10_000;
export const MAX_MATERIALIZED_BYTES = 16 * 1024 * 1024;

export class PlakyOutputLimitError extends Error {
  readonly code: "output-limit" | "materialization-limit" = "output-limit";
  readonly limit: "items" | "bytes";
  readonly maximum: number;

  constructor(limit: "items" | "bytes", maximum: number) {
    super(`Output ${limit} limit of ${maximum} was reached before the next item could be returned.`);
    this.name = "PlakyOutputLimitError";
    this.limit = limit;
    this.maximum = maximum;
  }
}

export class PlakyMaterializationLimitError extends PlakyOutputLimitError {
  override readonly code = "materialization-limit";

  constructor(limit: "items" | "bytes", maximum: number) {
    super(limit, maximum);
    this.name = "PlakyMaterializationLimitError";
  }
}

/** Return the exact UTF-8 byte length of a string in browser and Node runtimes. */
export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/** Read one bounded page chunk without retaining any future page. */
export async function readPagedChunk<T>(fetcher: PageFetcher<T>, options: ChunkOptions<T> = {}): Promise<BoundedChunk<T>> {
  const pageSize = options.pageSize ?? 100;
  const maxItems = options.maxItems ?? DEFAULT_CHUNK_MAX_ITEMS;
  const maxBytes = options.maxBytes ?? DEFAULT_CHUNK_MAX_BYTES;
  const cursor = normalizeCursor(options.cursor);
  const serialize = options.serialize ?? defaultSerialize;

  assertPositiveInteger(pageSize, "pageSize");
  assertNonNegativeInteger(maxItems, "maxItems");
  assertNonNegativeInteger(maxBytes, "maxBytes");
  if (maxItems === 0) throw new PlakyOutputLimitError("items", maxItems);

  const data: T[] = [];
  let bytes = 0;
  let page = cursor.page;
  let index = cursor.index;

  while (true) {
    throwIfAborted(options.signal);
    const rawPage = await fetcher({ page, pageSize });
    const checked = assertPagedResult<T>(rawPage, "boundedChunk");
    if (index > checked.data.length) {
      throw new PlakyResponseContractError("boundedChunk", "/data", { cause: rawPage });
    }

    for (; index < checked.data.length; index++) {
      throwIfAborted(options.signal);
      if (data.length >= maxItems) {
        return truncatedChunk(data, bytes, page, index);
      }
      const item = checked.data[index]!;
      const encoded = serialize(item);
      const itemBytes = utf8ByteLength(encoded);
      if (bytes + itemBytes > maxBytes) {
        if (data.length === 0) throw new PlakyOutputLimitError("bytes", maxBytes);
        return truncatedChunk(data, bytes, page, index);
      }
      data.push(item);
      bytes += itemBytes;
    }

    if (checked.hasMore && (data.length >= maxItems || bytes >= maxBytes)) {
      return truncatedChunk(data, bytes, page + 1, 0);
    }
    if (!checked.hasMore) {
      return {
        data,
        scanned: data.length,
        returned: data.length,
        bytes,
        complete: true,
        truncated: false,
      };
    }

    page++;
    index = 0;
  }
}

/** Lazily read bounded chunks. Calling `return()` stops all future page calls. */
export function iteratePagedChunks<T>(fetcher: PageFetcher<T>, options: ChunkOptions<T> = {}): ChunkIterator<T> {
  let cursor = normalizeCursor(options.cursor);
  let finished = false;

  const iterator: ChunkIterator<T> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (finished) return { done: true, value: undefined as never };
      const chunk = await readPagedChunk(fetcher, { ...options, cursor });
      if (chunk.nextCursor === undefined) {
        finished = true;
      } else {
        cursor = chunk.nextCursor;
      }
      return { done: false, value: chunk };
    },
    async return() {
      finished = true;
      return { done: true, value: undefined as never };
    },
    async throw(error) {
      finished = true;
      throw error;
    },
  };
  return iterator;
}

function truncatedChunk<T>(data: T[], bytes: number, page: number, index: number): BoundedChunk<T> {
  const nextCursor = { page, index } satisfies PageCursor;
  return {
    data,
    scanned: data.length,
    returned: data.length,
    bytes,
    complete: false,
    truncated: true,
    nextCursor,
  };
}

function normalizeCursor(cursor: PageCursor | undefined): PageCursor {
  const page = cursor?.page ?? 1;
  const index = cursor?.index ?? 0;
  assertPositiveInteger(page, "cursor.page");
  assertNonNegativeInteger(index, "cursor.index");
  return { page, index };
}

function defaultSerialize(value: unknown): string {
  return JSON.stringify(value) ?? "null";
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException("The operation was aborted.", "AbortError");
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`${name} must be a positive safe integer.`);
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer.`);
}
