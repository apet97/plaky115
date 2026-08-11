import assert from "node:assert/strict";
import { test } from "node:test";
import { formatStartupError } from "../esm/server/presentation.js";

test("startup error presentation is redacted, control-safe, and bounded", () => {
  const value = formatStartupError(new Error(`${["pl", "k_SECRET"].join("")}\x00\x1b${"x".repeat(10_000)}`));
  assert.ok(!value.includes("SECRET"));
  assert.ok(!/[\u0000-\u001f\u007f-\u009f]/u.test(value));
  assert.ok(value.includes("\\u0000"));
  assert.ok(value.includes("\\u001B"));
  assert.ok(new TextEncoder().encode(value).byteLength <= 4 * 1024);
});
