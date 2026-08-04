import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const metadata = JSON.parse(readFileSync(join(root, "openapi/plaky115-operation-metadata.json"), "utf8"));
const expectedManifest = JSON.parse(readFileSync(join(root, "openapi/plaky115-expected-operations.json"), "utf8"));
const operationSlugs = metadata.operations.map(({ operationId }) => slug(operationId));
const generatedHeader = "// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json";

function snapshot(paths) {
  return paths.map((path) => (existsSync(path) ? readFileSync(path, "utf8") : "")).join("\n---\n");
}

function snapshotDirectory(directory) {
  if (!existsSync(directory)) return "<missing>";
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => entry.isDirectory()
      ? `${entry.name}/\n${snapshotDirectory(join(directory, entry.name))}`
      : `${entry.name}\n${readFileSync(join(directory, entry.name), "utf8")}`)
    .join("\n---\n");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr ?? ""}`);
  }
}

test("generate-types is deterministic", () => {
  const target = join(root, "sdk/src/generated/types.ts");
  run("node", ["scripts/generate-types.mjs"]);
  const first = snapshot([target]);
  run("node", ["scripts/generate-types.mjs"]);
  assert.equal(snapshot([target]), first);
});

test("generate-mcp deletes only marked stale files and is deterministic", () => {
  withGeneratedRoot((generatedRoot) => {
    seedMetadata(generatedRoot);
    const rawDir = join(generatedRoot, "mcp-server/src/tools/raw");
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(rawDir, "stale.ts"), `${generatedHeader} operationId=stale\n`);
    writeFileSync(join(rawDir, "handwritten.ts"), "export const handwritten = true;\n");

    run("node", ["scripts/generate-mcp.mjs", "--source-root", root, "--output-root", generatedRoot]);
    assert.equal(existsSync(join(rawDir, "stale.ts")), false);
    assert.equal(readFileSync(join(rawDir, "handwritten.ts"), "utf8"), "export const handwritten = true;\n");
    const generatedFiles = readdirSync(rawDir).filter((file) => file.endsWith(".ts") && file !== "handwritten.ts");
    assert.deepEqual(generatedFiles.sort(), [...operationSlugs.map((value) => `${value}.ts`), "index.ts"].sort());

    const first = snapshotDirectory(rawDir);
    run("node", ["scripts/generate-mcp.mjs", "--source-root", root, "--output-root", generatedRoot]);
    assert.equal(snapshotDirectory(rawDir), first);
  });
});

test("generate-cli deletes only marked stale files, owns runners, and is deterministic", () => {
  withGeneratedRoot((generatedRoot) => {
    seedMetadata(generatedRoot);
    const rawDir = join(generatedRoot, "cli/internal/cli/raw");
    mkdirSync(rawDir, { recursive: true });
    writeFileSync(join(rawDir, "stale.go"), `${generatedHeader} operationId=stale\npackage raw\n`);
    writeFileSync(join(rawDir, "handwritten.go"), "package raw\n\nconst handwritten = true\n");

    run("node", ["scripts/generate-cli.mjs", "--source-root", root, "--output-root", generatedRoot]);
    assert.equal(existsSync(join(rawDir, "stale.go")), false);
    assert.equal(readFileSync(join(rawDir, "handwritten.go"), "utf8"), "package raw\n\nconst handwritten = true\n");
    const generatedFiles = readdirSync(rawDir).filter((file) => file.endsWith(".go") && file !== "handwritten.go");
    assert.deepEqual(generatedFiles.sort(), [...operationSlugs.map((value) => `${value}.go`), "raw.go"].sort());
    assert.equal(existsSync(join(generatedRoot, "cli/internal/plakysdk/operations.go")), true);
    assert.equal(existsSync(join(generatedRoot, "cli/internal/plakydx/runners_generated.go")), true);

    const first = snapshotDirectory(join(generatedRoot, "cli"));
    run("node", ["scripts/generate-cli.mjs", "--source-root", root, "--output-root", generatedRoot]);
    assert.equal(snapshotDirectory(join(generatedRoot, "cli")), first);
  });
});

test("generate-docs-index is deterministic", () => {
  const target = join(root, "mcp-server/src/runtime/docs-index.ts");
  run("node", ["scripts/generate-docs-index.mjs"]);
  const first = snapshot([target]);
  run("node", ["scripts/generate-docs-index.mjs"]);
  assert.equal(snapshot([target]), first);
});

test("metadata operations are unique, generated as one exact set, and remain within the intentional target manifest", () => {
  const actualKeys = metadata.operations.map(operationKey);
  const expectedKeys = expectedManifest.operations.map(operationKey);
  assert.equal(new Set(actualKeys).size, actualKeys.length);
  assert.equal(new Set(expectedKeys).size, expectedKeys.length);
  assert.deepEqual(actualKeys.filter((key) => !expectedKeys.includes(key)), []);
  assert.equal(operationSlugs.length, metadata.operations.length);
});

function withGeneratedRoot(callback) {
  const directory = mkdtempSync(join(tmpdir(), "plaky115-codegen-"));
  try {
    callback(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function seedMetadata(generatedRoot) {
  const metadataDirectory = join(generatedRoot, "openapi");
  mkdirSync(metadataDirectory, { recursive: true });
  copyFileSync(
    join(root, "openapi/plaky115-operation-metadata.json"),
    join(metadataDirectory, "plaky115-operation-metadata.json"),
  );
}

function slug(operationId) {
  return operationId.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function operationKey(operation) {
  return `${operation.method} ${operation.path} ${operation.operationId}`;
}
