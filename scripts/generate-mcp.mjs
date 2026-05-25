#!/usr/bin/env node
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMetadata, slug } from "./lib/codegen-common.mjs";
import { buildRawToolModule, buildRawToolIndex } from "./lib/codegen-mcp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "mcp-server/src/tools/raw");
mkdirSync(outDir, { recursive: true });

const metadata = loadMetadata(root);
const ops = metadata.operations;

const expected = new Set([...ops.map((o) => `${slug(o.operationId)}.ts`), "index.ts"]);
if (existsSync(outDir)) {
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".ts") && !expected.has(f)) rmSync(join(outDir, f));
  }
}

for (const op of ops) {
  writeFileSync(join(outDir, `${slug(op.operationId)}.ts`), buildRawToolModule(op));
}
writeFileSync(join(outDir, "index.ts"), buildRawToolIndex(ops));

console.log(`generate-mcp: wrote ${ops.length} raw tool modules`);
