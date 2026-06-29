import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHeaders, buildUrl, mergeHeadersInto, serializeBody } from "../esm/runtime/internal/request-builders.js";

test("buildUrl appends array query params without losing values", () => {
  const url = new URL(buildUrl("https://example.test", "/v1/items", { tag: ["a/b", "c"], page: 2 }));
  assert.deepEqual(url.searchParams.getAll("tag"), ["a/b", "c"]);
  assert.equal(url.searchParams.get("page"), "2");
});

test("buildUrl comma-joins explode:false expand into a single param", () => {
  const raw = buildUrl("https://example.test", "/v1/items", { expand: ["group", "createdBy"], page: 1 });
  const url = new URL(raw);
  assert.equal(url.searchParams.get("expand"), "group,createdBy");
  assert.deepEqual(url.searchParams.getAll("expand"), ["group,createdBy"]);
  assert.equal(url.searchParams.get("page"), "1");
  // Pin the raw wire bytes: the comma is percent-encoded as %2C and expand is
  // emitted once (not repeated). Decoded .get()/.getAll() cannot catch a wire regression.
  assert.match(raw, /[?&]expand=group%2CcreatedBy(?:&|$)/);
});

test("buildUrl serializes a single-value expand without a trailing comma", () => {
  const url = new URL(buildUrl("https://example.test", "/v1/items", { expand: ["fields"] }));
  assert.equal(url.searchParams.get("expand"), "fields");
});

test("buildUrl omits an empty expand array", () => {
  const url = new URL(buildUrl("https://example.test", "/v1/items", { expand: [] }));
  assert.equal(url.searchParams.has("expand"), false);
});

test("mergeHeadersInto deletes a default header when override value is empty", () => {
  const headers = new Headers({ "X-Trace": "client", Accept: "application/json" });
  mergeHeadersInto(headers, { "X-Trace": "" });
  assert.equal(headers.get("x-trace"), null);
  assert.equal(headers.get("accept"), "application/json");
});

test("serializeBody leaves BodyInit values untouched", () => {
  const headers = new Headers();
  const params = new URLSearchParams([["a", "1"]]);
  const body = serializeBody(params, headers);
  assert.equal(body, params);
  assert.equal(headers.get("content-type"), null);
});

test("buildHeaders resolves auth and custom header providers", async () => {
  const headers = await buildHeaders(
    { method: "POST", path: "/v1/items", body: { title: "x" } },
    {
      apiKey: async () => "plk_test",
      serverURL: "https://example.test",
      headers: async () => ({ "X-App": "sdk" }),
      idempotencyKey: "idem_1",
      userAgent: "plaky-test",
    },
  );

  assert.equal(headers.get("x-api-key"), "plk_test");
  assert.equal(headers.get("x-app"), "sdk");
  assert.equal(headers.get("idempotency-key"), "idem_1");
  assert.equal(headers.get("user-agent"), "plaky-test");
  assert.equal(headers.get("content-type"), "application/json");
});
