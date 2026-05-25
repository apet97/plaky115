import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, PlakyTimeoutError, SpaceId } from "../esm/index.js";

beforeEach(() => {
  globalThis.fetch = async (url) => {
    const u = url.toString();
    if (u.includes("/spaces/123/boards/456/items")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Item A" }], hasMore: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 123, title: "Ops" }], hasMore: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (u.endsWith("/users/me")) {
      return new Response(JSON.stringify({ id: 1, email: "me@example.com" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
});

test("client.spaces.list returns paged data", async () => {
  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  const page = await client.spaces.list({ page: 1, pageSize: 10 });
  assert.deepEqual(page.data?.[0]?.title, "Ops");
});

test("client.items.list flows path params into URL", async () => {
  let captured;
  globalThis.fetch = async (url) => {
    captured = url.toString();
    return new Response(JSON.stringify({ data: [{ id: 1 }], hasMore: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  await client.items.list({ spaceId: 123, boardId: 456 });
  assert.match(captured, /\/spaces\/123\/boards\/456\/items/);
});

test("resource methods encode path ID segments", async () => {
  let captured;
  globalThis.fetch = async (url) => {
    captured = url.toString();
    return new Response(JSON.stringify({ id: "space/with slash" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  await client.spaces.get(SpaceId("space/with slash"));
  assert.match(captured, /\/spaces\/space%2Fwith%20slash$/);
});

test("read methods apply per-request header overrides", async () => {
  let headers;
  globalThis.fetch = async (_url, init) => {
    headers = new Headers(init.headers);
    return new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const client = new PlakyClient({
    apiKey: "plk_test",
    serverURL: "https://example.test",
    headers: { "X-Trace": "client" },
  });
  await client.spaces.get(1, { headers: { "X-Trace": "request", "X-Once": "1" } });

  assert.equal(headers.get("x-trace"), "request");
  assert.equal(headers.get("x-once"), "1");
});

test("read methods apply per-request timeout overrides", async () => {
  const client = new PlakyClient({
    apiKey: "plk_test",
    serverURL: "https://example.test",
    timeoutMs: 30_000,
    fetch: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  });

  await assert.rejects(client.spaces.get(1, { timeoutMs: 1 }), (err) => err instanceof PlakyTimeoutError);
});

test("client.users.me hits /users/me", async () => {
  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  const me = await client.users.me();
  assert.equal(me.email, "me@example.com");
});

test("withOptions returns new instance preserving apiKey by default", () => {
  const c1 = new PlakyClient({ apiKey: "plk_a", serverURL: "https://a" });
  const c2 = c1.withOptions({ serverURL: "https://b" });
  assert.equal(c1.options.serverURL, "https://a");
  assert.equal(c2.options.serverURL, "https://b");
  assert.equal(c2.options.apiKey, "plk_a");
});

test("constructor throws without apiKey", () => {
  assert.throws(() => new PlakyClient({ apiKey: "" }), /apiKey is required/);
});

test("client.items.create returns dry-run plan when dryRun:true", async () => {
  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  const plan = await client.items.create({
    spaceId: 1,
    boardId: 2,
    body: { title: "hi" },
    dryRun: true,
  });
  assert.equal(plan.dryRun, true);
  assert.equal(plan.operation, "createItem");
  assert.deepEqual(plan.payload.body, { title: "hi" });
});

test("paginated iterator walks all pages", async () => {
  let n = 0;
  globalThis.fetch = async () => {
    n++;
    if (n === 1) return new Response(JSON.stringify({ data: [{ id: 1 }, { id: 2 }], hasMore: true }), { status: 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ data: [{ id: 3 }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://example.test" });
  const ids = [];
  for await (const s of client.spaces.iterate({ pageSize: 2 })) ids.push(s.id);
  assert.deepEqual(ids, [1, 2, 3]);
});

test("listAll resolves into an array", async () => {
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://example.test" });
  const all = await client.spaces.listAll();
  assert.ok(Array.isArray(all));
});
