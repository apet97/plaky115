#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targets = ["sdk/package.json", "mcp-server/package.json"];

const before = snapshot();
const result = spawnSync("node", ["scripts/postgen-dx.mjs"], { cwd: root, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
const after = snapshot();

const drift = targets.filter((rel) => before.get(rel) !== after.get(rel));
if (drift.length > 0) {
  console.error("Postgen drift detected:");
  for (const rel of drift) console.error(`  ${rel}`);
  process.exit(1);
}

console.log("postgen-drift: OK");

function snapshot() {
  return new Map(targets.map((rel) => [rel, readFileSync(join(root, rel), "utf8")]));
}
