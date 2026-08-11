#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocsIndex, emitDocsIndex } from "./lib/codegen-docs-index.mjs";
import { loadOperationMetadata } from "./lib/operation-metadata.mjs";
import { metadataPath, parseGenerationOptions } from "./lib/generation-options.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const options = parseGenerationOptions(process.argv.slice(2), root);
const out = join(options.outputRoot, "mcp-server/src/runtime/docs-index.ts");
mkdirSync(dirname(out), { recursive: true });
const entries = buildDocsIndex(options.sourceRoot, loadOperationMetadata(options.sourceRoot, metadataPath(options.outputRoot)));
writeFileSync(out, emitDocsIndex(entries));
console.log(`generate-docs-index: wrote ${entries.length} entries to ${out}`);
