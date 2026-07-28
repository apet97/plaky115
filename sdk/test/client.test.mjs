import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, PlakyTimeoutError, SpaceId, redact, redactRecord } from "../esm/index.js";

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
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
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

  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
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

  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
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

  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
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
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
  await client.items.list({ spaceId: 123, boardId: 456 });
  assert.match(captured, /\/spaces\/123\/boards\/456\/items/);
});

test("resource methods preserve exact int64 IDs and reject lossy IDs before fetch", async () => {
  const captured = [];
  globalThis.fetch = async (url) => {
    captured.push(url.toString());
    return new Response(JSON.stringify({ id: "9223372036854775807" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
  await client.spaces.get(SpaceId("9223372036854775807"));
  assert.match(captured[0], /\/spaces\/9223372036854775807$/);

  for (const id of ["9223372036854775808", "01", "-9223372036854775808", -1, 9_007_199_254_740_992]) {
    assert.throws(() => client.spaces.get(SpaceId(id)), /ID|IDs/);
  }
  assert.equal(captured.length, 1);
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
    apiKey: "test-api-key",
    serverURL: "https://example.test",
    headers: { "X-Trace": "client" },
  });
  await client.spaces.get(1, { headers: { "X-Trace": "request", "X-Once": "1" } });

  assert.equal(headers.get("x-trace"), "request");
  assert.equal(headers.get("x-once"), "1");
});

test("read methods apply per-request timeout overrides", async () => {
  const client = new PlakyClient({
    apiKey: "test-api-key",
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
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
  const me = await client.users.me();
  assert.equal(me.email, "me@example.com");
});

test("withOptions returns new instance preserving apiKey by default", () => {
  const c1 = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://a" });
  const c2 = c1.withOptions({ serverURL: "https://b" });
  assert.equal(c1.options.serverURL, "https://a");
  assert.equal(c2.options.serverURL, "https://b");
  assert.equal(c2.options.apiKey, "test-api-key");
});

test("constructor throws without apiKey", () => {
  assert.throws(() => new PlakyClient({ apiKey: "" }), /apiKey is required/);
  assert.throws(() => new PlakyClient({ apiKey: " \t\n" }), /apiKey is required/);
});

test("constructor rejects malformed or unsafe server URLs", () => {
  for (const serverURL of [
    "/relative",
    "not a URL",
    "ftp://example.test/api",
    "https:///missing-host",
    "https://user:pass@example.test/api",
    "https://example.test/api?token=value",
    "https://example.test/api#fragment",
    "http://example.test/api",
  ]) {
    assert.throws(() => new PlakyClient({ apiKey: "test-api-key", serverURL }), /serverURL/);
  }
});

test("constructor permits literal loopback HTTP only", () => {
  for (const serverURL of ["http://localhost:3000", "http://127.0.0.42:3000", "http://[::1]:3000"]) {
    assert.doesNotThrow(() => new PlakyClient({ apiKey: "test-api-key", serverURL }));
  }
});

test("constructor normalizes trailing slashes and preserves valid custom base paths", () => {
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test/proxy/plaky///" });
  assert.equal(client.options.serverURL, "https://example.test/proxy/plaky");
});

test("constructor rejects negative or NaN timeoutMs/maxRetries", () => {
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", timeoutMs: -1 }), /timeoutMs must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", timeoutMs: Number.NaN }), /timeoutMs must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", maxRetries: -2 }), /maxRetries must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", maxRetries: Number.NaN }), /maxRetries must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", maxRetries: Number.POSITIVE_INFINITY }), /maxRetries must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", timeoutMs: Number.POSITIVE_INFINITY }), /timeoutMs must be a non-negative number/);
  assert.throws(() => new PlakyClient({ apiKey: "test-api-key", maxRetries: 1.5 }), /maxRetries must be a non-negative integer/);
});

test("constructor accepts maxRetries:0 and large finite timeouts without clamping", () => {
  const client = new PlakyClient({ apiKey: "test-api-key", maxRetries: 0, timeoutMs: 3_600_000.5 });
  assert.equal(client.options.maxRetries, 0);
  assert.equal(client.options.timeoutMs, 3_600_000.5);
});

test("redact handles API-key-shaped tokens with separators", () => {
  const token = "plk_" + "TEST_SECRET-ABC123";
  assert.equal(redact(`echo ${token}`), "echo [REDACTED_PLAKY_API_KEY]");
});

test("redactRecord deep-redacts nested keys and tolerates non-serializable top-level input", () => {
  const token = "plk_" + "TEST_SECRET-ABC123";
  const cleaned = redactRecord({ auth: `Bearer ${token}`, nested: { note: token } });
  assert.equal(cleaned.auth, "Bearer [REDACTED_PLAKY_API_KEY]");
  assert.equal(cleaned.nested.note, "[REDACTED_PLAKY_API_KEY]");
  // Top-level non-serializable input is returned unchanged rather than throwing.
  assert.equal(redactRecord(undefined), undefined);
  const fn = () => token;
  assert.equal(redactRecord(fn), fn);
});

test("client.items.create returns dry-run plan when dryRun:true", async () => {
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
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
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
  const ids = [];
  for await (const s of client.spaces.iterate({ pageSize: 2 })) ids.push(s.id);
  assert.deepEqual(ids, [1, 2, 3]);
});

test("listAll resolves into an array", async () => {
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://example.test" });
  const all = await client.spaces.listAll();
  assert.ok(Array.isArray(all));
});
