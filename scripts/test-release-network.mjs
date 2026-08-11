import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchJsonBounded, RegistryRequestError, retryRegistryRead } from "./lib/release-network.mjs";

function response(body, status = 200, contentType = "application/json") {
  return new Response(body, { status, headers: { "content-type": contentType } });
}

test("bounded registry JSON fetch requires HTTPS JSON and enforces body limits", async () => {
  let options;
  const value = await fetchJsonBounded("https://registry.npmjs.org/example/1.0.0", {
    maxBytes: 64,
    fetchImpl: async (_url, received) => {
      options = received;
      return response('{"ok":true}');
    },
    allowedOrigin: "https://registry.npmjs.org",
  });
  assert.deepEqual(value, { ok: true });
  assert.equal(options.redirect, "error");
  await assert.rejects(fetchJsonBounded("http://registry.npmjs.org/example", { fetchImpl: async () => response("{}") }), /HTTPS/);
  await assert.rejects(fetchJsonBounded("https://registry.npmjs.org/example", { maxBytes: 2, fetchImpl: async () => response('{"too":"large"}') }), /size limit/);
  await assert.rejects(fetchJsonBounded("https://registry.npmjs.org/example", { fetchImpl: async () => response("not-json", 200, "text/plain") }), /not JSON/);
});

test("registry HTTP failures remain classified without accepting redirect or auth ambiguity", async () => {
  await assert.rejects(fetchJsonBounded("https://registry.npmjs.org/example", { fetchImpl: async () => response("{}", 404) }), (error) => error instanceof RegistryRequestError && error.status === 404);
  await assert.rejects(fetchJsonBounded("https://registry.npmjs.org/example", { fetchImpl: async () => response("{}", 302) }), (error) => error instanceof RegistryRequestError && error.status === 302);
});

test("eventual consistency retry is deadline bounded and only retries reviewed states", async () => {
  let attempts = 0;
  const result = await retryRegistryRead(async () => {
    attempts += 1;
    if (attempts < 3) throw new RegistryRequestError("not visible", { status: 404 });
    return "visible";
  }, { delayMs: 1, deadlineMs: 100, isTransient: (error) => error.status === 404 });
  assert.equal(result, "visible");
  assert.equal(attempts, 3);
  await assert.rejects(retryRegistryRead(async () => { throw new Error("not transient"); }, { isTransient: () => false }), /not transient/);
});
