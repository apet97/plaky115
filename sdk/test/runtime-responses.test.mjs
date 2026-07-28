import assert from "node:assert/strict";
import { test } from "node:test";
import { getRequestId, parseErrorBody, parseJSONPreservingInt64, parseResponse } from "../esm/runtime/internal/responses.js";

test("parseResponse handles text bytes and void response types", async () => {
  assert.equal(await parseResponse(new Response("hello"), "text"), "hello");
  assert.deepEqual([...await parseResponse(new Response("abc"), "bytes")], [97, 98, 99]);
  assert.equal(await parseResponse(new Response(null, { status: 204 }), "json"), undefined);
  assert.equal(await parseResponse(new Response("{}"), "void"), undefined);
});

test("parseResponse returns undefined for empty JSON body", async () => {
  assert.equal(await parseResponse(new Response(""), "json"), undefined);
});

test("JSON decoding preserves unsafe integer literals without changing strings or safe numbers", async () => {
  const value = parseJSONPreservingInt64('{"max":9223372036854775807,"min":-9223372036854775808,"safe":9007199254740991,"text":"9223372036854775807"}');
  assert.deepEqual(value, {
    max: "9223372036854775807",
    min: "-9223372036854775808",
    safe: 9007199254740991,
    text: "9223372036854775807",
  });
  assert.deepEqual(await parseResponse(new Response('{"id":9223372036854775807}'), "json"), { id: "9223372036854775807" });
});

test("parseErrorBody returns JSON when possible and text otherwise", async () => {
  assert.deepEqual(await parseErrorBody(new Response('{"message":"no"}')), { message: "no" });
  assert.equal(await parseErrorBody(new Response("not-json")), "not-json");
  assert.equal(await parseErrorBody(new Response("")), undefined);
});

test("getRequestId accepts common request id headers", () => {
  assert.equal(getRequestId(new Headers({ "x-request-id": "req_1" })), "req_1");
  assert.equal(getRequestId(new Headers({ "request-id": "req_2" })), "req_2");
  assert.equal(getRequestId(new Headers({ "x-correlation-id": "req_3" })), "req_3");
});
