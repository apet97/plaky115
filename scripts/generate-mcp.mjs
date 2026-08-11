#!/usr/bin/env node
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { slug } from "./lib/codegen-common.mjs";
import { buildRawToolModule, buildRawToolIndex } from "./lib/codegen-mcp.mjs";
import { loadOperationMetadata } from "./lib/operation-metadata.mjs";
import { metadataPath, parseGenerationOptions } from "./lib/generation-options.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const options = parseGenerationOptions(process.argv.slice(2), root);
const generatedRoot = options.outputRoot;
const outDir = join(generatedRoot, "mcp-server/src/tools/raw");
mkdirSync(outDir, { recursive: true });

const metadata = loadOperationMetadata(options.sourceRoot, metadataPath(generatedRoot));
const ops = metadata.operations;

const expected = new Set([...ops.map((o) => `${slug(o.operationId)}.ts`), "index.ts"]);
if (existsSync(outDir)) {
  for (const f of readdirSync(outDir)) {
    const path = join(outDir, f);
    if (f.endsWith(".ts") && !expected.has(f) && isGenerated(path)) rmSync(path);
  }
}

for (const op of ops) {
  const path = join(outDir, `${slug(op.operationId)}.ts`);
  assertGeneratedOrMissing(path);
  writeFileSync(path, buildRawToolModule(op));
}
const indexPath = join(outDir, "index.ts");
assertGeneratedOrMissing(indexPath);
writeFileSync(indexPath, buildRawToolIndex(ops));

console.log(`generate-mcp: wrote ${ops.length} raw tool modules`);

function isGenerated(path) {
  return readFileSync(path, "utf8").startsWith("// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json");
}

function assertGeneratedOrMissing(path) {
  if (existsSync(path) && !isGenerated(path)) {
    throw new Error(`refusing to overwrite unmarked file: ${path}`);
  }
}
