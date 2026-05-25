import assert from "node:assert/strict";
import { test } from "node:test";
import { PlakyClient, RateLimitSink } from "../esm/index.js";

test("RateLimitSink captures X-RateLimit-* headers after request", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-limit": "200",
        "x-ratelimit-remaining": "199",
        "x-ratelimit-reset": "1716624000",
      },
    });
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await client.spaces.list();
  assert.equal(client.rateLimit.last.limit, 200);
  assert.equal(client.rateLimit.last.remaining, 199);
  assert.equal(client.rateLimit.last.resetAt, 1716624000 * 1000);
});

test("RateLimitSink leaves unknown headers as undefined", async () => {
  globalThis.fetch = async () =>
    new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await client.spaces.list();
  assert.equal(client.rateLimit.last.limit, undefined);
  assert.equal(client.rateLimit.last.remaining, undefined);
});

test("estimatedRemaining falls back to client-side rolling window", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } });
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  assert.equal(client.rateLimit.estimatedRemaining(), 200);
  await client.spaces.list();
  await client.spaces.list();
  await client.spaces.list();
  assert.equal(client.rateLimit.estimatedRemaining(), 197);
  assert.equal(client.rateLimit.wouldThrottle(), false);
});

test("rolling window prunes entries past 60 seconds", () => {
  const sink = new RateLimitSink({ windowMs: 1000, maxPerWindow: 5 });
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) sink.record(t0 + i);
  assert.equal(sink.estimatedRemaining(t0 + 10), 0);
  assert.equal(sink.wouldThrottle(t0 + 10), true);
  // Half a second later, entries are still within the window.
  assert.equal(sink.estimatedRemaining(t0 + 500), 0);
  // After window expires, slots come back.
  assert.equal(sink.estimatedRemaining(t0 + 1500), 5);
});

test("msUntilNextSlot computes wait until oldest entry expires", () => {
  const sink = new RateLimitSink({ windowMs: 1000, maxPerWindow: 2 });
  sink.record(1000);
  sink.record(1500);
  assert.equal(sink.msUntilNextSlot(1500), 500);
  assert.equal(sink.msUntilNextSlot(2200), 0);
});

test("when server reports remaining, that takes precedence over rolling window", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { "content-type": "application/json", "x-ratelimit-remaining": "42" },
    });
  const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await client.spaces.list();
  assert.equal(client.rateLimit.estimatedRemaining(), 42);
});

test("RateLimitSink.reset clears both views", () => {
  const sink = new RateLimitSink();
  sink.record(1000);
  sink.record(2000);
  sink.reset();
  assert.equal(sink.estimatedRemaining(3000), 200);
  assert.deepEqual(sink.last, {});
});
