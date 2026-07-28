import assert from "node:assert/strict";
import { test } from "node:test";
import { describeOperation } from "./lib/codegen-common.mjs";

function operation(overrides = {}) {
  return { operationId: "listWidgets", method: "GET", path: "/v1/widgets/{widgetId}",
    parameters: [{ name: "widgetId", in: "path", required: true, schema: { type: "integer", format: "int64" } }],
    request: { kind: "none" }, success: { kind: "json-object" }, ...overrides };
}

test("normalized descriptor is frozen and shared facts are exact", () => {
  const descriptor = describeOperation(operation());
  assert.equal(descriptor.pathParameters[0].name, "widgetId");
  assert.equal(descriptor.requestKind, "none");
  assert.equal(descriptor.isVoid, false);
  assert.ok(Object.isFrozen(descriptor));
  assert.ok(Object.isFrozen(descriptor.pathParameters));
});

test("descriptor rejects placeholder drift and contradictory duplicate parameters", () => {
  assert.throws(() => describeOperation(operation({ parameters: [] })), /placeholders and parameters disagree/);
  assert.throws(() => describeOperation(operation({ parameters: [
    ...operation().parameters,
    { name: "ghostId", in: "path", required: true, schema: { type: "integer", format: "int64" } },
  ] })), /placeholders and parameters disagree/);
  const query = { name: "page", in: "query", required: false, schema: { type: "integer" } };
  assert.throws(() => describeOperation(operation({
    parameters: [operation().parameters[0], query],
    pagination: { inputs: [{ ...query, schema: { type: "string" } }] },
  })), /contradictory parameter schema/);
});

test("descriptor validates multipart shape once", () => {
  assert.throws(() => describeOperation(operation({ request: { kind: "multipart", parts: [] } })), /single required binary/);
});
