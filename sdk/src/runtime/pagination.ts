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

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGES = 10_000;

export function paginate<T>(fetcher: PageFetcher<T>, opts: PageOptions = {}): PaginatedIterator<T> {
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const iteratorLimit = opts.limit;

  assertPositiveInteger(pageSize, "pageSize");
  if (iteratorLimit !== undefined) assertNonNegativeInteger(iteratorLimit, "limit");

  let yielded = 0;
  let page = 1;
  let buffer: T[] = [];
  let done = false;

  const iterator: AsyncIterableIterator<T> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (iteratorLimit !== undefined && yielded >= iteratorLimit) {
        return { done: true, value: undefined as never };
      }

      while (buffer.length === 0 && !done) {
        const current = await fetchPage(fetcher, page++, pageSize);
        buffer = current.data.slice();
        done = !current.hasMore || current.data.length === 0;
      }

      if (buffer.length === 0) {
        return { done: true, value: undefined as never };
      }

      yielded++;
      return { done: false, value: buffer.shift()! };
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

        const current = await fetchPage(fetcher, nextPage++, pageSize);
        stop = !current.hasMore || current.data.length === 0;

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
      const current = await fetchPage(fetcher, nextPage++, pageSize);
      const remaining = max - out.length;
      out.push(...current.data.slice(0, remaining));

      if (!current.hasMore || current.data.length === 0) break;
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
  return {
    data: result.data ?? [],
    hasMore: result.hasMore === true,
    raw: result.raw,
  };
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
