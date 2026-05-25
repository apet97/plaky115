#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const targets = [
  "openapi/plaky115-dx.openapi.yaml",
  "openapi/plaky115-operation-metadata.json",
  "sdk/src/generated",
  "mcp-server/src/tools/raw",
  "mcp-server/src/runtime/docs-index.ts",
  "cli/internal/cli/raw",
  "cli/internal/plakysdk/operations.go",
];

const before = snapshotTargets();
run("npm", ["run", "generate:all"]);
const after = snapshotTargets();
const drift = diffSnapshots(before, after);

if (drift.length > 0) {
  console.error("Generated drift detected after npm run generate:all:");
  for (const rel of drift) console.error(`  ${rel}`);
  process.exit(1);
}

console.log("generated-drift: OK");

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function snapshotTargets() {
  const out = new Map();
  for (const rel of targets) snapshotPath(rel, out);
  return out;
}

function snapshotPath(rel, out) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    out.set(rel, "<missing>");
    return;
  }
  const stat = statSync(abs);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      snapshotPath(`${rel}/${entry.name}`, out);
    }
    return;
  }
  if (stat.isFile()) out.set(rel, readFileSync(abs, "utf8"));
}

function diffSnapshots(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].sort().filter((key) => before.get(key) !== after.get(key));
}
