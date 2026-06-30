import assert from "node:assert/strict";
import { test } from "node:test";
import { withRetries, PlakyRateLimitError, PlakyServerError } from "../esm/index.js";

function rateLimitError(retryAfterMs) {
  return new PlakyRateLimitError("rate", {
    status: 429,
    method: "GET",
    url: "https://x",
    headers: new Headers(),
    retryAfterMs,
  });
}

// Capture the delay handed to setTimeout while firing the callback immediately,
// so timing assertions don't actually wait.
async function withCapturedDelays(fn) {
  const realSetTimeout = globalThis.setTimeout;
  const delays = [];
  globalThis.setTimeout = (cb, ms) => {
    delays.push(ms);
    return realSetTimeout(cb, 0);
  };
  try {
    const result = await fn();
    return { result, delays };
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
}

test("withRetries retries a retryable error then resolves", async () => {
  let calls = 0;
  const { result } = await withCapturedDelays(() =>
    withRetries(async () => {
      calls++;
      if (calls === 1) {
        throw new PlakyServerError("boom", { status: 500, method: "GET", url: "https://x", headers: new Headers() });
      }
      return "ok";
    }, { maxRetries: 2 }),
  );
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});

test("withRetries clamps a hostile retry-after to <= 60s", async () => {
  let calls = 0;
  const { result, delays } = await withCapturedDelays(() =>
    withRetries(async () => {
      calls++;
      if (calls === 1) throw rateLimitError(999_999_999_000);
      return "ok";
    }, { maxRetries: 1 }),
  );
  assert.equal(result, "ok");
  assert.ok(delays.length >= 1);
  assert.ok(delays[0] <= 60_000 + 100, `delay ${delays[0]} should be clamped to <= 60s (+jitter)`);
});

test("withRetries ignores a non-positive retry-after and uses computed backoff", async () => {
  let calls = 0;
  const { delays } = await withCapturedDelays(() =>
    withRetries(async () => {
      calls++;
      if (calls === 1) throw rateLimitError(-5000);
      return "ok";
    }, { maxRetries: 1, baseDelayMs: 250 }),
  );
  assert.ok(delays[0] >= 250, `delay ${delays[0]} should fall back to computed backoff, not fire immediately`);
  assert.ok(delays[0] <= 350);
});

test("withRetries rethrows a non-retryable error without waiting", async () => {
  await assert.rejects(
    withRetries(async () => {
      throw new Error("not retryable");
    }, { maxRetries: 3 }),
    (err) => err.message === "not retryable",
  );
});
