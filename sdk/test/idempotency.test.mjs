import assert from "node:assert/strict";
import { test } from "node:test";
import { PlakyClient, newIdempotencyKey } from "../esm/index.js";

test("newIdempotencyKey produces unique values", () => {
  const a = newIdempotencyKey();
  const b = newIdempotencyKey();
  assert.notEqual(a, b);
  assert.match(a, /^idmp_/);
});

test("client.items.create auto-generates Idempotency-Key when caller omits", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await client.items.create({ spaceId: 1, boardId: 2, body: { title: "x" } });
  assert.match(captured.headers["Idempotency-Key"], /^item_/);
});

test("client.items.create honors caller-supplied Idempotency-Key", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await client.items.create({ spaceId: 1, boardId: 2, body: { title: "x" }, idempotencyKey: "my-key-001" });
  assert.equal(captured.headers["Idempotency-Key"], "my-key-001");
});

test("client.comments.delete sets Idempotency-Key with comment-del prefix", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(null, { status: 204 });
  };
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await client.comments.delete({ spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4 });
  assert.match(captured.headers["Idempotency-Key"], /^comment-del_/);
});
