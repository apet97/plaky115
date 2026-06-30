import assert from "node:assert/strict";
import { test } from "node:test";
import { paginate } from "../esm/runtime/pagination.js";

test("paginated iterator yields across pages", async () => {
  const iterator = paginate(
    async ({ page }) => ({
      data: page === 1 ? [1, 2] : [3],
      hasMore: page === 1,
      raw: { page },
    }),
    { pageSize: 2 },
  );

  const out = [];
  for await (const item of iterator) out.push(item);
  assert.deepEqual(out, [1, 2, 3]);
});

test("pages yields raw page objects", async () => {
  const iterator = paginate(async ({ page }) => ({ data: [page], hasMore: page < 2, raw: { page } }));
  const pages = [];
  for await (const page of iterator.pages()) pages.push(page.raw);
  assert.deepEqual(pages, [{ page: 1 }, { page: 2 }]);
});

test("firstPage returns page one without consuming the iterator", async () => {
  const iterator = paginate(async ({ page }) => ({ data: [page], hasMore: page < 2, raw: { page } }));

  assert.deepEqual((await iterator.firstPage()).data, [1]);

  const out = [];
  for await (const item of iterator) out.push(item);
  assert.deepEqual(out, [1, 2]);
});

test("toArray respects the requested limit", async () => {
  const iterator = paginate(async ({ page }) => ({ data: [page * 10, page * 10 + 1], hasMore: page < 3, raw: { page } }));

  assert.deepEqual(await iterator.toArray(3), [10, 11, 20]);
});

test("iterator limit caps items yielded by for-await and stops fetching", async () => {
  let calls = 0;
  const iterator = paginate(
    async ({ page }) => {
      calls++;
      return { data: [page * 10, page * 10 + 1], hasMore: true, raw: { page } };
    },
    { pageSize: 2, limit: 3 },
  );

  const out = [];
  for await (const item of iterator) out.push(item);
  assert.deepEqual(out, [10, 11, 20]);
  assert.ok(calls <= 2, `fetched ${calls} pages; should stop once the limit is reached`);
});

test("empty page with hasMore true stops instead of looping forever", async () => {
  let calls = 0;
  const iterator = paginate(async () => {
    calls++;
    return { data: [], hasMore: true, raw: {} };
  });

  assert.deepEqual(await iterator.toArray(), []);
  assert.equal(calls, 1);
});

test("invalid page size throws RangeError", () => {
  assert.throws(() => paginate(async () => ({ data: [], hasMore: false, raw: {} }), { pageSize: 0 }), RangeError);
});

test("invalid limit throws RangeError", () => {
  assert.throws(() => paginate(async () => ({ data: [], hasMore: false, raw: {} }), { limit: -1 }), RangeError);
});
