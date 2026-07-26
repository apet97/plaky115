import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { buildCobraCommand } from "./lib/codegen-cli.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

const cases = [
  ["cli-read.go", operation({
    operationId: "getWidget",
    path: "/v1/widgets/{widgetId}",
    parameters: [
      parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.\nRequired by the API."),
      parameter("status", "query", { type: "string", enum: ["OPEN", "DONE"] }, false, "Status filter."),
      parameter("limit", "query", { type: "integer", format: "int32" }, false, "Result limit."),
      parameter("cursor", "query", { type: "integer", format: "int64" }, false, "Numeric cursor."),
      parameter("labels", "query", { type: "array", items: { type: "string" } }, false, "Labels to match."),
    ],
  })],
  ["cli-json-write.go", operation({
    operationId: "createWidget",
    method: "POST",
    path: "/v1/widgets",
    request: { kind: "json", required: true, mediaType: "application/json" },
    success: { status: 201, kind: "json-object", mediaType: "application/json" },
    scopes: ["write"],
    readOnly: false,
    idempotent: false,
    mutation: true,
  })],
  ["cli-archive.go", operation({
    operationId: "archiveWidget",
    method: "PUT",
    path: "/v1/widgets/{widgetId}/archive",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
    success: { status: 200, kind: "void" },
    scopes: ["write", "destructive"],
    readOnly: false,
    destructive: true,
    confirmation: "destructive",
    mutation: true,
  })],
  ["cli-upload.go", operation({
    operationId: "uploadWidgetFile",
    method: "POST",
    path: "/v1/widgets/{widgetId}/files",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
    request: {
      kind: "multipart",
      required: true,
      mediaType: "multipart/form-data",
      parts: [{ name: "file", required: true, type: "string", format: "binary" }],
    },
    success: { status: 201, kind: "json-object", mediaType: "application/json" },
    scopes: ["write"],
    readOnly: false,
    idempotent: false,
    mutation: true,
  })],
  ["cli-delete.go", operation({
    operationId: "deleteWidget",
    method: "DELETE",
    path: "/v1/widgets/{widgetId}",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
    success: { status: 204, kind: "void" },
    scopes: ["write", "destructive"],
    readOnly: false,
    destructive: true,
    confirmation: "destructive",
    mutation: true,
  })],
];

for (const [fixture, metadata] of cases) {
  test(`CLI generator exact golden: ${fixture}`, () => {
    const expected = readFileSync(join(root, "test/fixtures/codegen", fixture), "utf8");
    assert.equal(buildCobraCommand(metadata), expected);
  });
}

test("CLI transport and confirmation flags do not use HTTP method heuristics", () => {
  const source = readFileSync(join(root, "scripts/lib/codegen-cli.mjs"), "utf8");
  const cobraSource = source.slice(0, source.indexOf("export function buildRawRoot"));
  assert.doesNotMatch(cobraSource, /op\.method\s*[!=]==?\s*["'](?:GET|DELETE)["']/);
  assert.doesNotMatch(cobraSource, /pathParams\(op\.path\)/);
});

function operation(overrides = {}) {
  const operationId = overrides.operationId ?? "getWidget";
  return {
    operationId,
    method: "GET",
    path: "/v1/widgets",
    parameters: [],
    query: [],
    pagination: null,
    request: { kind: "none", required: false },
    success: { status: 200, kind: "json-object", mediaType: "application/json" },
    mcpName: `plaky_${operationId}`,
    mcpTitle: operationId,
    summary: `${operationId} fixture`,
    scopes: ["read"],
    readOnly: true,
    destructive: false,
    idempotent: true,
    openWorld: true,
    confirmation: "none",
    compactKind: "raw",
    sensitiveOutput: false,
    list: false,
    mutation: false,
    bodyRequired: false,
    ...overrides,
  };
}

function parameter(name, location, schema, required, description, explode = true) {
  return { name, in: location, required, description, schema, style: location === "path" ? "simple" : "form", explode };
}
