import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import {
  COMPACT_KINDS,
  CONFIRMATION_VALUES,
  REQUEST_KINDS,
  SUCCESS_KINDS,
  validateOperationMetadata,
} from "./lib/operation-metadata.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("valid metadata loads without mutation or operation reordering", () => {
  const input = metadata([operation("second"), operation("first")]);
  const before = structuredClone(input);
  const validated = validateOperationMetadata(input);
  assert.deepEqual(input, before);
  assert.deepEqual(validated.operations.map(({ operationId }) => operationId), ["second", "first"]);
  assert.deepEqual(validated.operations[0].query, []);
  assert.equal(validated.operations[0].pagination, null);
  assert.deepEqual(REQUEST_KINDS, ["none", "json", "multipart"]);
  assert.deepEqual(SUCCESS_KINDS, ["json-object", "json-array", "paged-object", "void"]);
  assert.ok(COMPACT_KINDS.includes("downloadLink"));
  assert.deepEqual(CONFIRMATION_VALUES, ["none", "destructive"]);
});

test("descriptor versions are explicit and canonical", () => {
  const missing = metadata([operation("fixture")]);
  delete missing.descriptorVersion;
  assert.throws(() => validateOperationMetadata(missing), /descriptorVersion: unsupported value undefined/);
  const unknown = metadata([operation("fixture")]);
  unknown.descriptorVersion = 1;
  assert.throws(() => validateOperationMetadata(unknown), /descriptorVersion: unsupported value 1/);
});

test("missing keys and unknown request, success, compact, or confirmation kinds fail with paths", () => {
  const cases = [
    ["request", undefined, /operation fixture at request: is required/],
    ["request.kind", "other", /operation fixture at request\.kind: unsupported value/],
    ["success.kind", "other", /operation fixture at success\.kind: unsupported value/],
    ["compactKind", "other", /operation fixture at compactKind: unsupported value/],
    ["confirmation", "other", /operation fixture at confirmation: unsupported value/],
  ];
  for (const [path, value, message] of cases) {
    const candidate = metadata([operation("fixture")]);
    setPath(candidate.operations[0], path, value);
    assert.throws(() => validateOperationMetadata(candidate), message);
  }
});

test("duplicate operation IDs and MCP names fail", () => {
  assert.throws(
    () => validateOperationMetadata(metadata([operation("same"), operation("same")])),
    /duplicate operationId: same/,
  );
  const first = operation("one");
  const second = operation("two");
  second.mcpName = first.mcpName;
  assert.throws(
    () => validateOperationMetadata(metadata([first, second])),
    /duplicate mcpName: plaky_one/,
  );
});

test("invalid parameter schemas fail with operation and property path", () => {
  const candidate = metadata([operation("fixture")]);
  candidate.operations[0].parameters = [{
    name: "filter",
    in: "query",
    required: false,
    schema: { type: "object" },
    style: "form",
    explode: true,
  }];
  assert.throws(
    () => validateOperationMetadata(candidate),
    /operation fixture at parameters\[0\]\.schema\.type: unsupported value object/,
  );
});

test("descriptor preserves and validates parameter bounds and pagination references", () => {
  const candidate = metadata([operation("listFixture")]);
  const page = {
    name: "page",
    in: "query",
    required: false,
    style: "form",
    explode: true,
    schema: {
      type: "integer",
      format: "int32",
      minimum: 1,
      maximum: 2147483647,
      exclusiveMinimum: 0,
    },
  };
  const size = {
    ...page,
    name: "pageSize",
    schema: { ...page.schema, default: 50, minLength: -1 },
  };
  candidate.operations[0].pagination = {
    kind: "pageNumber",
    pageParameter: "page",
    sizeParameter: "pageSize",
    resultsPointer: "$.data",
    hasMorePointer: "$.hasMore",
    inputs: [page, size],
  };
  assert.throws(
    () => validateOperationMetadata(candidate),
    /operation listFixture at pagination\.inputs\[1\]\.schema\.minLength: must be a non-negative integer/,
  );

  const contradiction = metadata([operation("listFixture")]);
  contradiction.operations[0].parameters = [page];
  contradiction.operations[0].pagination = {
    kind: "pageNumber",
    pageParameter: "page",
    sizeParameter: "pageSize",
    resultsPointer: "$.data",
    hasMorePointer: "$.hasMore",
    inputs: [page, { ...page, name: "pageSize" }],
  };
  assert.throws(
    () => validateOperationMetadata(contradiction),
    /operation listFixture at pagination\.inputs: duplicates generic query parameter page/,
  );
});

test("all JavaScript generator entry points use the same validator", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plaky115-loader-test-"));
  const invalidPath = join(directory, "invalid.json");
  const outputRoot = join(directory, "output");
  await mkdir(join(outputRoot, "openapi"), { recursive: true });
  const invalid = metadata([operation("fixture")]);
  invalid.operations[0].request.kind = "invalid";
  await writeFile(invalidPath, JSON.stringify(invalid));
  await copyFile(invalidPath, join(outputRoot, "openapi/plaky115-operation-metadata.json"));
  for (const script of ["generate-mcp.mjs", "generate-cli.mjs", "generate-docs-index.mjs"]) {
    const result = spawnSync(process.execPath, [`scripts/${script}`, "--source-root", root, "--output-root", outputRoot], {
      cwd: root,
      env: { ...process.env, PLAKY115_METADATA_PATH: join(directory, "ignored.json") },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0, script);
    assert.match(result.stderr, /operation fixture at request\.kind: unsupported value invalid/, script);
  }
  await rm(directory, { recursive: true, force: true });
});

test("canonical generators ignore hidden metadata path overrides", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plaky115-loader-source-test-"));
  const outputRoot = join(directory, "output");
  await mkdir(join(outputRoot, "openapi"), { recursive: true });
  await copyFile(
    join(root, "openapi/plaky115-operation-metadata.json"),
    join(outputRoot, "openapi/plaky115-operation-metadata.json"),
  );
  const result = spawnSync(process.execPath, [
    "scripts/generate-mcp.mjs",
    "--source-root", root,
    "--output-root", outputRoot,
  ], {
    cwd: root,
    env: { ...process.env, PLAKY115_METADATA_PATH: join(directory, "missing.json") },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  await rm(directory, { recursive: true, force: true });
});

function metadata(operations) {
  return { descriptorVersion: 2, generatedAt: "deterministic", source: "fixture", operations };
}

function operation(operationId) {
  return {
    operationId,
    method: "GET",
    path: `/fixture/${operationId}`,
    parameters: [],
    request: { kind: "none", required: false },
    success: {
      status: 200,
      kind: "json-object",
      mediaType: "application/json",
      rootKind: "object",
      requiredProperties: [],
    },
    mcpName: `plaky_${operationId}`,
    mcpTitle: operationId,
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
  };
}

function setPath(object, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  const parent = parts.reduce((current, part) => current[part], object);
  if (value === undefined) delete parent[key];
  else parent[key] = value;
}
