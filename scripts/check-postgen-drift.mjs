#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targets = ["sdk/package.json", "mcp-server/package.json"];

const generatedRoot = mkdtempSync(join(tmpdir(), "plaky115-postgen-drift-"));
let exitCode = 0;
try {
  const before = snapshot(root);
  const result = spawnSync(process.execPath, [
    "scripts/postgen-dx.mjs",
    "--source-root", root,
    "--output-root", generatedRoot,
  ], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`postgen-dx failed with status ${result.status ?? "unknown"}`);
  const after = snapshot(generatedRoot);

  const drift = targets.filter((rel) => before.get(rel) !== after.get(rel));
  if (drift.length > 0) {
    throw new Error(["Postgen drift detected:", ...drift.map((rel) => `  ${rel}`)].join("\n"));
  }

  console.log("postgen-drift: OK");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  rmSync(generatedRoot, { recursive: true, force: true });
}
if (exitCode !== 0) process.exit(exitCode);

function snapshot(base) {
  return new Map(targets.map((rel) => [rel, readFileSync(join(base, rel), "utf8")]));
}
