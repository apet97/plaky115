import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, PlakyTimeoutError, SpaceId, redact } from "../esm/index.js";

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

test("client.spaces.list serializes expand array query values", async () => {
  let captured;
  globalThis.fetch = async (url) => {
    captured = new URL(url.toString());
    return new Response(JSON.stringify({ data: [], hasMore: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  await client.spaces.list({ expand: ["board"], pageSize: 100 });

  assert.deepEqual(captured.searchParams.getAll("expand"), ["board"]);
  assert.equal(captured.searchParams.get("pageSize"), "100");
});

test("client.users.list serializes email filters as repeated query values", async () => {
  let captured;
  globalThis.fetch = async (url) => {
    captured = new URL(url.toString());
    return new Response(JSON.stringify({ data: [], hasMore: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  await client.users.list({ emails: ["a@example.com", "b@example.com"], status: "ACTIVE", type: "MEMBER" });

  assert.deepEqual(captured.searchParams.getAll("emails"), ["a@example.com", "b@example.com"]);
  assert.equal(captured.searchParams.get("status"), "ACTIVE");
  assert.equal(captured.searchParams.get("type"), "MEMBER");
});

test("client.items.list forwards expanded query coverage", async () => {
  let captured;
  globalThis.fetch = async (url) => {
    captured = new URL(url.toString());
    return new Response(JSON.stringify({ data: [], hasMore: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
  await client.items.list({
    spaceId: 123,
    boardId: 456,
    boardViewId: 789,
    parentId: 111,
    subitemsBehaviour: "INCLUDE",
    expand: ["fields"],
  });

  assert.equal(captured.searchParams.get("boardViewId"), "789");
  assert.equal(captured.searchParams.get("parentId"), "111");
  assert.equal(captured.searchParams.get("subitemsBehaviour"), "INCLUDE");
  assert.deepEqual(captured.searchParams.getAll("expand"), ["fields"]);
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

test("constructor rejects negative or NaN timeoutMs/maxRetries", () => {
  assert.throws(() => new PlakyClient({ apiKey: "plk_test", timeoutMs: -1 }), /timeoutMs must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "plk_test", timeoutMs: Number.NaN }), /timeoutMs must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "plk_test", maxRetries: -2 }), /maxRetries must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "plk_test", maxRetries: Number.NaN }), /maxRetries must be a non-negative number/);
});

test("constructor accepts maxRetries:0 and large finite timeouts without clamping", () => {
  const client = new PlakyClient({ apiKey: "plk_test", maxRetries: 0, timeoutMs: 3_600_000 });
  assert.equal(client.options.maxRetries, 0);
  assert.equal(client.options.timeoutMs, 3_600_000);
});

test("redact handles API-key-shaped tokens with separators", () => {
  const token = "plk_" + "TEST_SECRET-ABC123";
  assert.equal(redact(`echo ${token}`), "echo plk_***");
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
