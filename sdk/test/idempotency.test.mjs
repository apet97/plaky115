import assert from "node:assert/strict";
import { test } from "node:test";
import { PlakyClient, PlakyServerError, newIdempotencyKey } from "../esm/index.js";
import { resolveExplicitIdempotencyKey, resolveIdempotencyKey } from "../esm/runtime/idempotency.js";

test("newIdempotencyKey produces unique values", () => {
  const a = newIdempotencyKey();
  const b = newIdempotencyKey();
  assert.notEqual(a, b);
  assert.match(a, /^idmp_/);
});

test("legacy resolver remains generated-by-default while explicit resolver never generates", () => {
  assert.match(resolveIdempotencyKey({}, undefined, "legacy"), /^legacy_/);
  assert.equal(resolveIdempotencyKey({ idempotencyKey: "params" }, { idempotencyKey: "options" }, "legacy"), "params");
  assert.equal(resolveExplicitIdempotencyKey({}, undefined), undefined);
  assert.equal(resolveExplicitIdempotencyKey({}, { idempotencyKey: "options" }), "options");
  assert.equal(resolveExplicitIdempotencyKey({ idempotencyKey: "params" }, { idempotencyKey: "options" }), "params");
});

test("client.items.create omits Idempotency-Key when caller omits", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await client.items.create({ spaceId: 1, boardId: 2, body: { title: "x" } });
  assert.equal(new Headers(captured.headers).get("idempotency-key"), null);
});

test("client.items.create honors caller-supplied Idempotency-Key", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await client.items.create({ spaceId: 1, boardId: 2, body: { title: "x" }, idempotencyKey: "my-key-001" });
  assert.equal(new Headers(captured.headers).get("idempotency-key"), "my-key-001");
});

test("client.items.create honors second-argument Idempotency-Key", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await client.items.create({ spaceId: 1, boardId: 2, body: { title: "x" } }, { idempotencyKey: "second-key-001" });
  assert.equal(new Headers(captured.headers).get("idempotency-key"), "second-key-001");
});

test("params Idempotency-Key wins over second-argument Idempotency-Key", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await client.items.create(
    { spaceId: 1, boardId: 2, body: { title: "x" }, idempotencyKey: "params-key-001" },
    { idempotencyKey: "second-key-001" },
  );
  assert.equal(new Headers(captured.headers).get("idempotency-key"), "params-key-001");
});

test("every mutation is attempted once and sends only an explicit Idempotency-Key", async (t) => {
  const mutations = [
    ["items.create", (client, idempotencyKey, options) => client.items.create({ spaceId: 1, boardId: 2, body: { title: "x" }, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["items.delete", (client, idempotencyKey, options) => client.items.delete({ spaceId: 1, boardId: 2, itemId: 3, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["items.updateField", (client, idempotencyKey, options) => client.items.updateField({ spaceId: 1, boardId: 2, itemId: 3, itemFieldKey: "status", body: { value: "Done" }, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["items.updateFields", (client, idempotencyKey, options) => client.items.updateFields({ spaceId: 1, boardId: 2, itemId: 3, body: { status: "Done" }, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["comments.create", (client, idempotencyKey, options) => client.comments.create({ spaceId: 1, boardId: 2, itemId: 3, body: { text: "x" }, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["comments.update", (client, idempotencyKey, options) => client.comments.update({ spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4, body: { text: "x" }, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["comments.delete", (client, idempotencyKey, options) => client.comments.delete({ spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
    ["reactions.replace", (client, idempotencyKey, options) => client.reactions.replace({ spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4, body: { reactions: [] }, ...(idempotencyKey ? { idempotencyKey } : {}) }, options)],
  ];

  for (const [name, invoke] of mutations) {
    for (const explicit of [false, true]) {
      await t.test(`${name} ${explicit ? "with" : "without"} explicit key`, async () => {
        let calls = 0;
        let captured;
        globalThis.fetch = async (_url, init) => {
          calls++;
          captured = init;
          return new Response(JSON.stringify({ message: "stop" }), {
            status: 500,
            headers: { "content-type": "application/json", "retry-after": "0" },
          });
        };
        const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x", maxRetries: 3 });
        const key = explicit ? "caller-key" : undefined;
        await assert.rejects(invoke(client, key, { maxRetries: 3 }), PlakyServerError);
        assert.equal(calls, 1);
        assert.equal(new Headers(captured.headers).get("idempotency-key"), explicit ? "caller-key" : null);
      });
    }
  }
});
