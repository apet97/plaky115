import assert from "node:assert/strict";
import { test } from "node:test";

import { compareExpectedOperations } from "./check-expected-operations.mjs";

test("exact operation sets compare successfully", () => {
  const expected = [operation("one", "GET", "/one")];
  assert.deepEqual(compareExpectedOperations(expected, [...expected]), {
    missing: [],
    unexpected: [],
  });
});

test("duplicate method and path keys are rejected", () => {
  assert.throws(
    () => compareExpectedOperations([
      operation("one", "GET", "/same"),
      operation("two", "GET", "/same"),
    ], []),
    /duplicate expected method\/path: GET \/same/,
  );
});

test("missing expected keys are reported", () => {
  const expected = [
    operation("one", "GET", "/one"),
    operation("two", "POST", "/two"),
  ];
  assert.deepEqual(compareExpectedOperations(expected, expected.slice(0, 1)), {
    missing: [expected[1]],
    unexpected: [],
  });
});

test("unexpected actual keys are reported", () => {
  const expected = [operation("one", "GET", "/one")];
  const extra = operation("two", "POST", "/two");
  assert.deepEqual(compareExpectedOperations(expected, [...expected, extra]), {
    missing: [],
    unexpected: [extra],
  });
});

function operation(operationId, method, path) {
  return { operationId, method, path };
}
