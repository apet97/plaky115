#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { slug } from "./lib/codegen-common.mjs";
import { buildCobraCommand, buildRawRoot, buildGoOperations, buildGoRunners } from "./lib/codegen-cli.mjs";
import { loadOperationMetadata } from "./lib/operation-metadata.mjs";
import { metadataPath, parseGenerationOptions } from "./lib/generation-options.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const options = parseGenerationOptions(process.argv.slice(2), root);
const generatedRoot = options.outputRoot;
const outDir = join(generatedRoot, "cli/internal/cli/raw");
mkdirSync(outDir, { recursive: true });

const metadata = loadOperationMetadata(options.sourceRoot, metadataPath(generatedRoot));
const ops = metadata.operations;

const expected = new Set([...ops.map((o) => `${slug(o.operationId)}.go`), "raw.go"]);
if (existsSync(outDir)) {
  for (const f of readdirSync(outDir)) {
    const path = join(outDir, f);
    if (f.endsWith(".go") && !expected.has(f) && isGenerated(path)) rmSync(path);
  }
}

for (const op of ops) {
  const path = join(outDir, `${slug(op.operationId)}.go`);
  assertGeneratedOrMissing(path);
  writeFileSync(path, buildCobraCommand(op));
}
const rawRootPath = join(outDir, "raw.go");
assertGeneratedOrMissing(rawRootPath);
writeFileSync(rawRootPath, buildRawRoot(ops));

// Go SDK operations live next to the hand-crafted client.
const sdkDir = join(generatedRoot, "cli/internal/plakysdk");
mkdirSync(sdkDir, { recursive: true });
const operationsPath = join(sdkDir, "operations.go");
assertGeneratedOrMissing(operationsPath);
writeFileSync(operationsPath, buildGoOperations(ops));

const dxDir = join(generatedRoot, "cli/internal/plakydx");
mkdirSync(dxDir, { recursive: true });
const runnersPath = join(dxDir, "runners_generated.go");
assertGeneratedOrMissing(runnersPath);
writeFileSync(runnersPath, buildGoRunners(ops));

const goFiles = [
  ...readdirSync(outDir).filter((f) => f.endsWith(".go")).map((f) => join(outDir, f)),
  operationsPath,
  runnersPath,
];
const gofmt = spawnSync("gofmt", ["-w", ...goFiles], { encoding: "utf8" });
if (gofmt.status !== 0) {
  process.stderr.write(gofmt.stderr);
  process.exit(gofmt.status ?? 1);
}

console.log(`generate-cli: wrote ${ops.length} raw cobra commands + operations.go`);

function isGenerated(path) {
  return readFileSync(path, "utf8").startsWith("// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json");
}

function assertGeneratedOrMissing(path) {
  if (existsSync(path) && !isGenerated(path)) {
    throw new Error(`refusing to overwrite unmarked file: ${path}`);
  }
}
