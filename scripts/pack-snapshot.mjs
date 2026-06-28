#!/usr/bin/env node
// Tarball-contents baseline + drift check for the published SDK and MCP
// packages. Complements pack-smoke.mjs (which checks a few must-have /
// must-not-have entries) by pinning the *entire* sorted file list so any
// accidental add/drop in the published surface is caught deterministically.
//
//   node scripts/pack-snapshot.mjs --write   # regenerate the baselines
//   node scripts/pack-snapshot.mjs --check   # fail on drift (default)
//
// Baselines live at <pkg>/.packsnapshot (one sorted path per line). Run with a
// fresh build, exactly like pack-smoke; verify runs the SDK/MCP builds first.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PACKAGES = ["sdk", "mcp-server"];

function packFiles(pkg) {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: join(root, pkg),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`npm pack failed for ${pkg}: ${result.stderr}`);
    process.exit(1);
  }
  const [parsed] = JSON.parse(result.stdout);
  return parsed.files.map((f) => f.path).sort();
}

function snapshotPath(pkg) {
  return join(root, pkg, ".packsnapshot");
}

function render(files) {
  return files.join("\n") + "\n";
}

const mode = process.argv.includes("--write") ? "write" : "check";

if (mode === "write") {
  for (const pkg of PACKAGES) {
    const files = packFiles(pkg);
    writeFileSync(snapshotPath(pkg), render(files));
    console.log(`pack-snapshot WRITE ${pkg}: ${files.length} files`);
  }
  process.exit(0);
}

let drift = false;
for (const pkg of PACKAGES) {
  const path = snapshotPath(pkg);
  if (!existsSync(path)) {
    console.error(`${pkg}: missing .packsnapshot baseline (run npm run packsnapshot:write)`);
    drift = true;
    continue;
  }
  const baseline = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const current = packFiles(pkg);
  const baseSet = new Set(baseline);
  const curSet = new Set(current);
  const added = current.filter((f) => !baseSet.has(f));
  const removed = baseline.filter((f) => !curSet.has(f));
  if (added.length === 0 && removed.length === 0) {
    console.log(`pack-snapshot OK ${pkg}: ${current.length} files`);
    continue;
  }
  drift = true;
  console.error(`pack-snapshot DRIFT ${pkg}:`);
  for (const f of added) console.error(`  + ${f}`);
  for (const f of removed) console.error(`  - ${f}`);
  console.error(`  update with: npm run packsnapshot:write`);
}

if (drift) process.exit(1);
