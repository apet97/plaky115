import assert from "node:assert/strict";
import { test } from "node:test";
import { canRetry, retryDelay, shouldRetryResponse } from "../esm/runtime/internal/retry-policy.js";

test("retryDelay honors retry-after zero for deterministic tests", () => {
  const response = new Response("{}", { status: 500, headers: { "retry-after": "0" } });
  assert.equal(retryDelay(response, 3), 0);
});

test("retryDelay parses retry-after dates", () => {
  const date = new Date(Date.now() + 10_000).toUTCString();
  const response = new Response("{}", { status: 429, headers: { "retry-after": date } });
  const delay = retryDelay(response, 0);
  assert.ok(delay >= 0);
  assert.ok(delay <= 60_000);
});

test("shouldRetryResponse retries GET 500 inside retry budget", () => {
  const response = new Response("{}", { status: 500 });
  assert.equal(shouldRetryResponse({ method: "GET", path: "/v1/x" }, {}, response, 0, 1), true);
});

test("shouldRetryResponse does not retry unsafe mutation without idempotency key", () => {
  const response = new Response("{}", { status: 500 });
  assert.equal(shouldRetryResponse({ method: "POST", path: "/v1/x" }, {}, response, 0, 1), false);
});

test("canRetry allows writes only with an idempotency key", () => {
  assert.equal(canRetry({ method: "GET", path: "/v1/x" }, {}), true);
  assert.equal(canRetry({ method: "POST", path: "/v1/x" }, {}), false);
  assert.equal(canRetry({ method: "POST", path: "/v1/x" }, { idempotencyKey: "idem" }), true);
});
