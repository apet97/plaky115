import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient } from "../esm/index.js";

const COMMENTS = [
  { id: 10, content: "Looks good", createdAt: "2024-01-01T00:00:00Z", createdBy: 7 },
  { id: 11, content: "Shipping it", createdAt: "2024-01-02T00:00:00Z", createdBy: 8 },
];

function clientReturning(body) {
  globalThis.fetch = async () =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  return new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
}

beforeEach(() => {
  globalThis.fetch = async () => new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
});

test("comments.list normalizes a bare-array response into a PagedResult page", async () => {
  const c = clientReturning(COMMENTS);
  const page = await c.comments.list({ spaceId: 1, boardId: 2, itemId: 3 });
  assert.equal(page.hasMore, false);
  assert.equal(page.data.length, 2);
  assert.equal(page.data[0].content, "Looks good");
});

test("comments.listAll walks the bare array (no longer silently empty)", async () => {
  const c = clientReturning(COMMENTS);
  const all = await c.comments.listAll({ spaceId: 1, boardId: 2, itemId: 3 });
  assert.equal(all.length, 2);
  assert.deepEqual(all.map((x) => x.id), [10, 11]);
});

test("comments.iterate yields each comment from the bare array", async () => {
  const c = clientReturning(COMMENTS);
  const seen = [];
  for await (const comment of c.comments.iterate({ spaceId: 1, boardId: 2, itemId: 3 })) seen.push(comment.id);
  assert.deepEqual(seen, [10, 11]);
});

test("comments.list still accepts a PagedResult envelope if the API ever returns one", async () => {
  const c = clientReturning({ data: COMMENTS, hasMore: false, page: 1, pageSize: 50 });
  const page = await c.comments.list({ spaceId: 1, boardId: 2, itemId: 3 });
  assert.equal(page.data.length, 2);
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 50);
});

test("comments.listAll returns empty for an empty array", async () => {
  const c = clientReturning([]);
  const all = await c.comments.listAll({ spaceId: 1, boardId: 2, itemId: 3 });
  assert.equal(all.length, 0);
});
