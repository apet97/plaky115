#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMetadata, slug } from "./lib/codegen-operations.mjs";
import { buildCobraCommand, buildRawRoot, buildGoOperations } from "./lib/codegen-cli.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "cli/internal/cli/raw");
mkdirSync(outDir, { recursive: true });

const metadata = loadMetadata(root);
const ops = metadata.operations;

const expected = new Set([...ops.map((o) => `${slug(o.operationId)}.go`), "raw.go"]);
if (existsSync(outDir)) {
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".go") && !expected.has(f)) rmSync(join(outDir, f));
  }
}

for (const op of ops) {
  writeFileSync(join(outDir, `${slug(op.operationId)}.go`), buildCobraCommand(op));
}
writeFileSync(join(outDir, "raw.go"), buildRawRoot(ops));

// Go SDK operations live next to the hand-crafted client.
const sdkDir = join(root, "cli/internal/plakysdk");
mkdirSync(sdkDir, { recursive: true });
writeFileSync(join(sdkDir, "operations.go"), buildGoOperations(ops));

const goFiles = [
  ...readdirSync(outDir).filter((f) => f.endsWith(".go")).map((f) => join(outDir, f)),
  join(sdkDir, "operations.go"),
];
const gofmt = spawnSync("gofmt", ["-w", ...goFiles], { encoding: "utf8" });
if (gofmt.status !== 0) {
  process.stderr.write(gofmt.stderr);
  process.exit(gofmt.status ?? 1);
}

console.log(`generate-cli: wrote ${ops.length} raw cobra commands + operations.go`);
