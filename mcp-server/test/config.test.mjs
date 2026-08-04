import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveServerURL } from "../esm/server/config.js";

test("server URL precedence prefers the explicit flag over the environment", () => {
  assert.equal(resolveServerURL("https://flag.example", { PLAKY115_BASE_URL: "https://env.example" }), "https://flag.example");
});

test("server URL falls back to PLAKY115_BASE_URL and preserves an explicit empty value", () => {
  assert.equal(resolveServerURL(undefined, { PLAKY115_BASE_URL: "https://env.example" }), "https://env.example");
  assert.equal(resolveServerURL("", { PLAKY115_BASE_URL: "https://env.example" }), "");
  assert.equal(resolveServerURL(undefined, {}), undefined);
});
