import assert from "node:assert/strict";
import { test } from "node:test";
import { request, requestWithResponse } from "../esm/runtime/http.js";
import {
  PlakyAbortError,
  PlakyApiError,
  PlakyConflictError,
  PlakyConnectionError,
  PlakyPermissionError,
  PlakyNotFoundError,
  PlakyRateLimitError,
  PlakyServerError,
  PlakyTimeoutError,
  PlakyUnprocessableEntityError,
  PlakyAuthError,
} from "../esm/runtime/errors.js";

test("request builds url, sends auth header, parses JSON", async () => {
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url: url.toString(), init };
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const result = await request(
    { method: "GET", path: "/v1/public/spaces", query: { page: 1 }, operationId: "listSpaces" },
    { apiKey: "plk_test", serverURL: "https://example.test" },
  );
  assert.deepEqual(result, { ok: true });
  assert.equal(new Headers(captured.init.headers).get("x-api-key"), "plk_test");
  assert.match(captured.url, /\/v1\/public\/spaces\?page=1$/);
});

test("non-2xx body becomes typed error (404 → NotFound)", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "nope" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(
    request(
      { method: "GET", path: "/v1/missing", operationId: "x" },
      { apiKey: "plk_test", serverURL: "https://example.test" },
    ),
    (err) => err instanceof PlakyNotFoundError && err.status === 404,
  );
});

test("429 carries retry-after as ms", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "rate" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "2" },
    });
  await assert.rejects(
    request(
      { method: "GET", path: "/v1/limited", operationId: "x" },
      { apiKey: "plk_test", serverURL: "https://example.test" },
    ),
    (err) => err instanceof PlakyRateLimitError && err.retryAfterMs === 2000,
  );
});

test("422 → UnprocessableEntityError", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "invalid" }), {
      status: 422,
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(
    request(
      { method: "POST", path: "/v1/x", body: {}, operationId: "x" },
      { apiKey: "plk_test", serverURL: "https://example.test" },
    ),
    (err) => err instanceof PlakyUnprocessableEntityError,
  );
});

test("401 → AuthError", async () => {
  globalThis.fetch = async () =>
    new Response("", { status: 401 });
  await assert.rejects(
    request(
      { method: "GET", path: "/v1/x", operationId: "x" },
      { apiKey: "plk_test", serverURL: "https://example.test" },
    ),
    (err) => err instanceof PlakyAuthError,
  );
});

test("403, 409, and 500 map to specific typed errors", async () => {
  const cases = [
    [403, PlakyPermissionError],
    [409, PlakyConflictError],
    [500, PlakyServerError],
  ];

  for (const [status, ErrorClass] of cases) {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: `status ${status}` }), {
        status,
        headers: { "content-type": "application/json" },
      });

    await assert.rejects(
      request(
        { method: "GET", path: "/v1/x", operationId: "x" },
        { apiKey: "plk_test", serverURL: "https://example.test" },
      ),
      (err) => err instanceof ErrorClass,
    );
  }
});

test("error exposes method url headers body requestId and nested code", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "nested", code: "E_NESTED" } }), {
      status: 400,
      headers: { "content-type": "application/json", "x-request-id": "req_123" },
    });

  await assert.rejects(
    request(
      { method: "POST", path: "/v1/x", body: { a: 1 }, operationId: "x" },
      { apiKey: "plk_test", serverURL: "https://example.test" },
    ),
    (err) =>
      err instanceof PlakyApiError &&
      err.method === "POST" &&
      err.url === "https://example.test/v1/x" &&
      err.headers.get("x-request-id") === "req_123" &&
      err.requestId === "req_123" &&
      err.code === "E_NESTED" &&
      err.body?.error?.message === "nested",
  );
});

test("custom fetch is used instead of global fetch", async () => {
  globalThis.fetch = async () => {
    throw new Error("global fetch should not be used");
  };

  const result = await request(
    { method: "GET", path: "/v1/custom", operationId: "x" },
    {
      apiKey: "plk_test",
      serverURL: "https://example.test",
      fetch: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    },
  );

  assert.deepEqual(result, { ok: true });
});

test("async api key and header providers resolve for each request", async () => {
  let apiKeyCalls = 0;
  let headerCalls = 0;
  const seen = [];

  globalThis.fetch = async (_url, init) => {
    seen.push(new Headers(init.headers));
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  const opts = {
    apiKey: async () => `plk_${++apiKeyCalls}`,
    serverURL: "https://example.test",
    headers: async () => ({ "X-Request-Number": String(++headerCalls) }),
  };

  await request({ method: "GET", path: "/v1/a", operationId: "a" }, opts);
  await request({ method: "GET", path: "/v1/b", operationId: "b" }, opts);

  assert.equal(seen[0].get("x-api-key"), "plk_1");
  assert.equal(seen[1].get("x-api-key"), "plk_2");
  assert.equal(seen[0].get("x-request-number"), "1");
  assert.equal(seen[1].get("x-request-number"), "2");
});

test("requestWithResponse returns metadata and data", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "content-type": "application/json", "x-request-id": "req_meta" },
    });

  const response = await requestWithResponse(
    { method: "GET", path: "/v1/meta", operationId: "x" },
    { apiKey: "plk_test", serverURL: "https://example.test" },
  );

  assert.deepEqual(response.data, { ok: true });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-request-id"), "req_meta");
  assert.equal(response.requestId, "req_meta");
});

test("responseType text bytes and void parse correctly", async () => {
  globalThis.fetch = async (_url, init) => {
    const method = init.method;
    if (method === "DELETE") return new Response(null, { status: 204 });
    return new Response(method === "PATCH" ? "abc" : "hello", { status: 200 });
  };

  const text = await request(
    { method: "GET", path: "/v1/text", operationId: "text", responseType: "text" },
    { apiKey: "plk_test", serverURL: "https://example.test" },
  );
  const bytes = await request(
    { method: "PATCH", path: "/v1/bytes", operationId: "bytes", responseType: "bytes", body: "x", },
    { apiKey: "plk_test", serverURL: "https://example.test", idempotencyKey: "idem" },
  );
  const empty = await request(
    { method: "DELETE", path: "/v1/void", operationId: "void", responseType: "void" },
    { apiKey: "plk_test", serverURL: "https://example.test", idempotencyKey: "idem" },
  );

  assert.equal(text, "hello");
  assert.deepEqual([...bytes], [97, 98, 99]);
  assert.equal(empty, undefined);
});

test("FormData body does not set JSON content type", async () => {
  let headers;
  globalThis.fetch = async (_url, init) => {
    headers = new Headers(init.headers);
    return new Response("{}", { status: 200 });
  };

  const body = new FormData();
  body.set("file", "value");
  await request(
    { method: "POST", path: "/v1/form", body, operationId: "form" },
    { apiKey: "plk_test", serverURL: "https://example.test", idempotencyKey: "idem" },
  );

  assert.equal(headers.get("content-type"), null);
});

test("query values encode arrays and dates", async () => {
  let captured;
  globalThis.fetch = async (url) => {
    captured = url.toString();
    return new Response("{}", { status: 200 });
  };

  await request(
    {
      method: "GET",
      path: "/v1/query",
      query: { q: "a b", tag: ["x/y", "z"], at: new Date("2026-05-25T00:00:00.000Z") },
      operationId: "query",
    },
    { apiKey: "plk_test", serverURL: "https://example.test" },
  );

  const url = new URL(captured);
  assert.equal(url.searchParams.get("q"), "a b");
  assert.deepEqual(url.searchParams.getAll("tag"), ["x/y", "z"]);
  assert.equal(url.searchParams.get("at"), "2026-05-25T00:00:00.000Z");
});

test("timeout throws PlakyTimeoutError", async () => {
  const fetchNever = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    });

  await assert.rejects(
    request(
      { method: "GET", path: "/v1/slow", operationId: "slow" },
      { apiKey: "plk_test", serverURL: "https://example.test", timeoutMs: 1, fetch: fetchNever },
    ),
    (err) => err instanceof PlakyTimeoutError,
  );
});

test("external abort throws PlakyAbortError", async () => {
  const controller = new AbortController();
  controller.abort();

  const fetchAborted = async (_url, init) => {
    if (init.signal.aborted) throw new DOMException("aborted", "AbortError");
    return new Response("{}");
  };

  await assert.rejects(
    request(
      { method: "GET", path: "/v1/abort", operationId: "abort" },
      { apiKey: "plk_test", serverURL: "https://example.test", signal: controller.signal, fetch: fetchAborted },
    ),
    (err) => err instanceof PlakyAbortError,
  );
});

test("rejected fetch throws PlakyConnectionError", async () => {
  await assert.rejects(
    request(
      { method: "GET", path: "/v1/network", operationId: "network" },
      {
        apiKey: "plk_test",
        serverURL: "https://example.test",
        fetch: async () => {
          throw new TypeError("network down");
        },
      },
    ),
    (err) => err instanceof PlakyConnectionError,
  );
});

test("idempotency key passed through as header on mutations", async () => {
  let captured;
  globalThis.fetch = async (_url, init) => {
    captured = init;
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  await request(
    { method: "POST", path: "/v1/x", body: { a: 1 }, operationId: "x" },
    { apiKey: "plk_test", serverURL: "https://example.test", idempotencyKey: "test-key-123" },
  );
  assert.equal(new Headers(captured.headers).get("idempotency-key"), "test-key-123");
});

test("maxRetries retries a retryable GET once before succeeding", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({ message: "temporary" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await request(
    { method: "GET", path: "/v1/public/spaces", operationId: "listSpaces" },
    { apiKey: "plk_test", serverURL: "https://example.test", maxRetries: 1 },
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 2);
});

test("maxRetries stops after the configured retry budget", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ message: "temporary" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  };

  await assert.rejects(
    request(
      { method: "GET", path: "/v1/public/spaces", operationId: "listSpaces" },
      { apiKey: "plk_test", serverURL: "https://example.test", maxRetries: 2 },
    ),
    (err) => err.status === 500,
  );
  assert.equal(calls, 3);
});

test("maxRetries does not retry validation, auth, or not-found responses", async () => {
  for (const status of [400, 401, 404]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ message: "permanent" }), {
        status,
        headers: { "content-type": "application/json" },
      });
    };

    await assert.rejects(
      request(
        { method: "GET", path: "/v1/public/spaces", operationId: "listSpaces" },
        { apiKey: "plk_test", serverURL: "https://example.test", maxRetries: 2 },
      ),
    );
    assert.equal(calls, 1, `status ${status} should not be retried`);
  }
});

test("maxRetries does not retry mutations without an idempotency key", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ message: "temporary" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  };

  await assert.rejects(
    request(
      { method: "POST", path: "/v1/public/spaces/1/boards/2/items", body: { title: "x" }, operationId: "createItem" },
      { apiKey: "plk_test", serverURL: "https://example.test", maxRetries: 2 },
    ),
  );
  assert.equal(calls, 1);
});

test("maxRetries retries mutations when an idempotency key is present", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) {
      return new Response(JSON.stringify({ message: "temporary" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ id: 123 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await request(
    { method: "POST", path: "/v1/public/spaces/1/boards/2/items", body: { title: "x" }, operationId: "createItem" },
    { apiKey: "plk_test", serverURL: "https://example.test", maxRetries: 1, idempotencyKey: "idem-1" },
  );

  assert.deepEqual(result, { id: 123 });
  assert.equal(calls, 2);
});
