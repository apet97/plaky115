#!/usr/bin/env node
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMetadata, slug, buildOperationModule, buildOperationTable } from "./lib/codegen-operations.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "sdk/src/generated/operations");
mkdirSync(outDir, { recursive: true });

const metadata = loadMetadata(root);
const ops = metadata.operations;

const expectedFiles = new Set(ops.map((op) => `${slug(op.operationId)}.ts`));
if (existsSync(outDir)) {
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".ts") && !expectedFiles.has(f)) {
      rmSync(join(outDir, f));
    }
  }
}

for (const op of ops) {
  const out = join(outDir, `${slug(op.operationId)}.ts`);
  writeFileSync(out, buildOperationModule(op));
}

writeFileSync(join(root, "sdk/src/generated/operation-table.ts"), buildOperationTable(ops));

console.log(`generate-operations: wrote ${ops.length} modules + operation-table.ts`);
