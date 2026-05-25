import assert from "node:assert/strict";
import { test } from "node:test";
import { request } from "../esm/runtime/http.js";
import { PlakyNotFoundError, PlakyRateLimitError, PlakyValidationError, PlakyAuthError } from "../esm/runtime/errors.js";

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
  assert.equal(captured.init.headers["X-API-Key"], "plk_test");
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

test("422 → ValidationError", async () => {
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
    (err) => err instanceof PlakyValidationError,
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
  assert.equal(captured.headers["Idempotency-Key"], "test-key-123");
});
