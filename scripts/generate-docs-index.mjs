#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMetadata } from "./lib/codegen-operations.mjs";
import { buildDocsIndex, emitDocsIndex } from "./lib/codegen-docs-index.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "mcp-server/src/runtime/docs-index.ts");
mkdirSync(dirname(out), { recursive: true });
const entries = buildDocsIndex(root, loadMetadata(root));
writeFileSync(out, emitDocsIndex(entries));
console.log(`generate-docs-index: wrote ${entries.length} entries to ${out}`);
