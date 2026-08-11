import { PlakyResponseContractError } from "./errors.js";
import type { StrictPagedResult } from "../client/shapes.js";

export type Page<T> = {
  data: T[];
  hasMore: boolean;
  raw: unknown;
};

export type PageFetcher<T> = (cursor: { page: number; pageSize: number }) => Promise<Page<T>>;

export type PageOptions = {
  pageSize?: number | undefined;
  limit?: number | undefined;
};

export type PaginatedIterator<T> = AsyncIterableIterator<T> & {
  firstPage(): Promise<Page<T>>;
  pages(): AsyncIterableIterator<Page<T>>;
  toArray(limit?: number): Promise<T[]>;
};

/** Validate a paged API root once, before any list/search control flow uses it. */
export function assertPagedResult<T>(value: unknown, operationId: string): StrictPagedResult<T> {
  const record = assertPageFields(value, operationId);
  return record as StrictPagedResult<T>;
}

/** Validate a bare-array API root once, before a caller treats it as complete. */
export function assertArrayResult<T>(value: unknown, operationId: string): T[] {
  if (!Array.isArray(value)) {
    throw new PlakyResponseContractError(operationId, "/", { cause: value });
  }
  return value as T[];
}

const DEFAULT_PAGE_SIZE = 100;

/**
 * Safety valve, not an API contract. Bounds an otherwise unbounded paging loop
 * so a server that always reports `hasMore: true` cannot spin forever. The CLI
 * uses the same value (`cli/internal/cli/curated_helpers.go`). Not configurable. See
 * `docs/api-behavior.md`.
 */
const MAX_PAGES = 10_000;

export function paginate<T>(fetcher: PageFetcher<T>, opts: PageOptions = {}): PaginatedIterator<T> {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const iteratorLimit = opts.limit;

  assertPositiveInteger(pageSize, "pageSize");
  if (iteratorLimit !== undefined) assertNonNegativeInteger(iteratorLimit, "limit");

  let yielded = 0;
  let page = 1;
  let buffer: T[] = [];
  let bufferIndex = 0;
  let done = false;

  const iterator: AsyncIterableIterator<T> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (iteratorLimit !== undefined && yielded >= iteratorLimit) {
        return { done: true, value: undefined as never };
      }

      while (bufferIndex >= buffer.length && !done) {
        const current = await fetchPage(fetcher, page, pageSize);
        page++;
        buffer = current.data.slice();
        bufferIndex = 0;
        done = !current.hasMore;
      }

      if (bufferIndex >= buffer.length) {
        return { done: true, value: undefined as never };
      }

      yielded++;
      return { done: false, value: buffer[bufferIndex++]! };
    },
  };

  async function firstPage(): Promise<Page<T>> {
    return fetchPage(fetcher, 1, pageSize);
  }

  function pages(): AsyncIterableIterator<Page<T>> {
    let nextPage = 1;
    let stop = false;

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (stop) return { done: true, value: undefined as never };

        const current = await fetchPage(fetcher, nextPage, pageSize);
        nextPage++;
        stop = !current.hasMore;

        return { done: false, value: current };
      },
    };
  }

  async function toArray(limit?: number): Promise<T[]> {
    if (limit !== undefined) assertNonNegativeInteger(limit, "limit");

    const max = Math.min(iteratorLimit ?? Number.POSITIVE_INFINITY, limit ?? Number.POSITIVE_INFINITY);
    const out: T[] = [];
    let nextPage = 1;

    while (out.length < max) {
      const current = await fetchPage(fetcher, nextPage, pageSize);
      nextPage++;
      const remaining = max - out.length;
      out.push(...current.data.slice(0, remaining));

      if (!current.hasMore) break;
    }

    return out;
  }

  return Object.assign(iterator, { firstPage, pages, toArray });
}

async function fetchPage<T>(fetcher: PageFetcher<T>, page: number, pageSize: number): Promise<Page<T>> {
  if (page > MAX_PAGES) {
    throw new RangeError(`Pagination exceeded ${MAX_PAGES} pages.`);
  }

  const result = await fetcher({ page, pageSize });
  const checked = assertPageFields(result, "paginate");
  return {
    data: checked.data as T[],
    hasMore: checked.hasMore,
    raw: result.raw,
  };
}

function assertPageFields(value: unknown, operationId: string): { data: unknown[]; hasMore: boolean } & Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new PlakyResponseContractError(operationId, "/", { cause: value });
  }
  const record = value as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "data")) {
    throw new PlakyResponseContractError(operationId, "/data", { cause: value });
  }
  if (!Array.isArray(record["data"])) {
    throw new PlakyResponseContractError(operationId, "/data", { cause: value });
  }
  if (!Object.prototype.hasOwnProperty.call(record, "hasMore")) {
    throw new PlakyResponseContractError(operationId, "/hasMore", { cause: value });
  }
  if (typeof record["hasMore"] !== "boolean") {
    throw new PlakyResponseContractError(operationId, "/hasMore", { cause: value });
  }
  if (record["data"].length === 0 && record["hasMore"] === true) {
    throw new PlakyResponseContractError(operationId, "/hasMore", { cause: value });
  }
  return record as { data: unknown[]; hasMore: boolean } & Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer.`);
  }
}
