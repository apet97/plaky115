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
  pages(): AsyncIterableIterator<Page<T>>;
};

export function paginate<T>(fetcher: PageFetcher<T>, opts: PageOptions = {}): PaginatedIterator<T> {
  const pageSize = opts.pageSize ?? 100;
  const limit = opts.limit;
  let yielded = 0;
  let page = 1;
  let buffer: T[] = [];
  let done = false;

  const iterator: AsyncIterableIterator<T> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (limit !== undefined && yielded >= limit) return { done: true, value: undefined as never };
      while (buffer.length === 0 && !done) {
        const p = await fetcher({ page, pageSize });
        buffer = p.data ?? [];
        done = !p.hasMore;
        page++;
      }
      if (buffer.length === 0) return { done: true, value: undefined as never };
      yielded++;
      return { done: false, value: buffer.shift()! };
    },
  };

  function pages(): AsyncIterableIterator<Page<T>> {
    let pg = 1;
    let stop = false;
    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        if (stop) return { done: true, value: undefined as never };
        const p = await fetcher({ page: pg++, pageSize });
        if (!p.hasMore) stop = true;
        return { done: false, value: p };
      },
    };
  }

  return Object.assign(iterator, { pages });
}
