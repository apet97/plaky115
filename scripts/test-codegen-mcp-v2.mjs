import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { buildRawToolModule } from "./lib/codegen-mcp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

const cases = [
  ["mcp-get-object.ts", operation({
    operationId: "getWidget",
    path: "/v1/widgets/{widgetId}",
    parameters: [
      parameter("widgetId", "path", { type: "integer", format: "int64" }, true, "Widget identifier."),
      parameter("status", "query", { type: "string", enum: ["OPEN", "DONE"] }, false, "Status filter."),
      parameter("limit", "query", { type: "integer", default: 50 }, false, "Result limit."),
      parameter("labels", "query", { type: "array", items: { type: "string" } }, false, "Labels to match.", true),
    ],
    compactKind: "item",
  })],
  ["mcp-json-post.ts", operation({
    operationId: "createWidget",
    method: "POST",
    path: "/v1/widgets",
    request: { kind: "json", required: true, mediaType: "application/json" },
    success: { status: 201, kind: "json-object", mediaType: "application/json" },
    scopes: ["write"],
    readOnly: false,
    idempotent: false,
    mutation: true,
    bodyRequired: true,
  })],
  ["mcp-bodyless-put.ts", operation({
    operationId: "archiveWidget",
    method: "PUT",
    path: "/v1/widgets/{widgetId}/archive",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
    success: { status: 200, kind: "void" },
    scopes: ["write"],
    readOnly: false,
    idempotent: true,
    mutation: true,
  })],
  ["mcp-array-get.ts", operation({
    operationId: "listWidgetFiles",
    path: "/v1/widgets/{widgetId}/files",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
    success: { status: 200, kind: "json-array", mediaType: "application/json" },
    compactKind: "itemFile",
    list: true,
  })],
  ["mcp-destructive.ts", operation({
    operationId: "deleteWidget",
    method: "DELETE",
    path: "/v1/widgets/{widgetId}",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
    success: { status: 204, kind: "void" },
    scopes: ["write", "destructive"],
    readOnly: false,
    destructive: true,
    idempotent: true,
    confirmation: "destructive",
    mutation: true,
  })],
  ["mcp-multipart.ts", operation({
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
    compactKind: "itemFile",
    sensitiveOutput: true,
    mutation: true,
  })],
];

for (const [fixture, metadata] of cases) {
  test(`MCP generator exact golden: ${fixture}`, () => {
    const expected = readFileSync(join(root, "test/fixtures/codegen", fixture), "utf8");
    assert.equal(buildRawToolModule(metadata), expected);
  });
}

test("MCP generator has no method/path transport or compaction heuristics", () => {
  const source = readFileSync(join(root, "scripts/lib/codegen-mcp.mjs"), "utf8");
  assert.doesNotMatch(source, /hasBody\s*=\s*op\.method/);
  assert.doesNotMatch(source, /op\.method\s*===\s*["']DELETE["']/);
  assert.doesNotMatch(source, /function pickCompact|op\.path\.includes/);
});

test("MCP generator escapes every template-literal metacharacter in paths", () => {
  const source = buildRawToolModule(operation({
    path: "/v1/widgets\\segment`/{widgetId}",
    parameters: [parameter("widgetId", "path", { type: "string" }, true, "Widget identifier.")],
  }));
  const pathLine = source.split("\n").find((line) => line.trimStart().startsWith("path:"));
  assert.equal(pathLine, '      path: `/v1/widgets\\\\segment\\`/${encodeURIComponent(String(parsed.widgetId))}`,');
});

test("MCP multipart generation rejects every shape except one required binary file part", () => {
  const base = cases.find(([fixture]) => fixture === "mcp-multipart.ts")[1];
  for (const parts of [
    [],
    [{ name: "upload", required: true, type: "string", format: "binary" }],
    [{ name: "file", required: false, type: "string", format: "binary" }],
    [{ name: "file", required: true, type: "string", format: "text" }],
    [
      { name: "file", required: true, type: "string", format: "binary" },
      { name: "caption", required: false, type: "string" },
    ],
  ]) {
    assert.throws(
      () => buildRawToolModule({ ...base, request: { ...base.request, parts } }),
      /single required binary multipart part named file/,
    );
  }
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
    mcpName: `plaky_${operationId.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`,
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
