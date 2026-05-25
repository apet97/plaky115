import assert from "node:assert/strict";
import { test } from "node:test";
import { PlakyClient } from "../esm/index.js";

test("request interceptor can rewrite URL before fetch", async () => {
  let lastUrl;
  globalThis.fetch = async (url) => {
    lastUrl = url.toString();
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const client = new PlakyClient({
    apiKey: "plk_test",
    serverURL: "https://example.test",
    interceptors: {
      request({ url, init }) {
        return { url: url + "&injected=1", init };
      },
    },
  });
  await client.spaces.list({ page: 1 });
  assert.match(lastUrl, /injected=1/);
});

test("response interceptor sees status code and body", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ payload: 42 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  let observed;
  const client = new PlakyClient({
    apiKey: "plk_test",
    serverURL: "https://example.test",
    interceptors: {
      response({ response, body, operationId }) {
        observed = { status: response.status, body, operationId };
      },
    },
  });
  await client.spaces.list();
  assert.equal(observed.status, 200);
  assert.deepEqual(observed.body, { payload: 42 });
  assert.equal(observed.operationId, "listSpaces");
});
