import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { buildCobraCommand, buildGoOperations, buildGoRunners } from "./lib/codegen-cli.mjs";

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

test("Go operation methods are an exact golden and valid gofmt input", () => {
  const generated = buildGoOperations(cases.map(([, metadata]) => metadata));
  const expected = readFileSync(join(root, "test/fixtures/codegen/cli-operations-v2.go"), "utf8");
  assert.equal(generated, expected);
  assertGofmt(generated);
});

test("Go runners are an exact golden and valid gofmt input", () => {
  const generated = buildGoRunners(cases.map(([, metadata]) => metadata));
  const expected = readFileSync(join(root, "test/fixtures/codegen/cli-runners-v2.go"), "utf8");
  assert.equal(generated, expected);
  assertGofmt(generated);
  assert.match(generated, /RunUploadWidgetFile/);
  assert.match(generated, /defer upload\.Close\(\)/);
  assert.doesNotMatch(generated, /io\.ReadAll/);
});

test("Go generators thread descriptor request, response, and integer bounds", () => {
  const metadata = operation({
    operationId: "createBoundedWidget",
    method: "POST",
    request: {
      kind: "json",
      required: true,
      rootKind: "object",
      requiredProperties: ["title", "color"],
    },
    success: {
      status: 201,
      kind: "json-object",
      rootKind: "object",
      createdIdPointer: "$.id",
    },
    parameters: [parameter("page", "query", { type: "integer", minimum: 1, maximum: 10 }, false, "Page.")],
  });
  const operations = buildGoOperations([metadata]);
  const runners = buildGoRunners([metadata]);
  assert.match(operations, /opts\.Page != 0 && opts\.Page < 1/);
  assert.match(operations, /ValidateJSONBody\(jsonBody, true, "title", "color"\)/);
  assert.match(operations, /ValidateResponseShape\("createBoundedWidget", "json-object", out, \[\]string\{\}, true, false\)/);
  assert.match(runners, /jsonBodyFlag\(cmd, true, "title", "color"\)/);
  assert.match(runners, /optionalIntFlag\(cmd, "page", 1, 10\)/);
  assertGofmt(operations);
  assertGofmt(runners);
});

function assertGofmt(source) {
  const result = spawnSync("gofmt", { input: source, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, source, "generated Go must already be gofmt formatted");
}

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
