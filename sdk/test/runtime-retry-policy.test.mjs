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

test("retryDelay applies capped full jitter to the exponential (no Retry-After) branch", () => {
  const realRandom = Math.random;
  try {
    Math.random = () => 0; // jitter floor → capped/2
    assert.equal(retryDelay(undefined, 0), 125); // min(60000, 250)/2
    assert.equal(retryDelay(undefined, 40), 30_000); // capped at 60000 → 30000, no 2^31 overflow
    Math.random = () => 1; // jitter ceiling → full capped
    assert.ok(retryDelay(undefined, 0) <= 250);
    assert.ok(retryDelay(undefined, 40) <= 60_000);
  } finally {
    Math.random = realRandom;
  }
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
