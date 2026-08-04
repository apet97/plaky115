#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
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
  "cli/internal/plakydx/runners_generated.go",
];

const sourceRoot = parseSourceRoot(process.argv.slice(2));
const generatedRoot = mkdtempSync(join(tmpdir(), "plaky115-generated-drift-"));
let exitCode = 0;
try {
  const before = snapshotTargets(root);
  run(process.execPath, [
    "scripts/generate-all.mjs",
    "--source-root", sourceRoot,
    "--output-root", generatedRoot,
  ]);
  const after = snapshotTargets(generatedRoot);
  const drift = diffSnapshots(before, after);

  if (drift.length > 0) {
    throw new Error([
      "Generated drift detected after isolated generation:",
      ...drift.map((rel) => `  ${rel}`),
    ].join("\n"));
  }

  console.log("generated-drift: OK");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  rmSync(generatedRoot, { recursive: true, force: true });
}
if (exitCode !== 0) process.exit(exitCode);

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`);
}

function parseSourceRoot(args) {
  const index = args.indexOf("--source-root");
  if (index === -1) return root;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error("--source-root requires a path");
  return value;
}

function snapshotTargets(base) {
  const out = new Map();
  for (const rel of targets) snapshotPath(base, rel, out);
  return out;
}

function snapshotPath(base, rel, out) {
  const abs = join(base, rel);
  if (!existsSync(abs)) {
    out.set(rel, "<missing>");
    return;
  }
  const stat = statSync(abs);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(abs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      snapshotPath(base, `${rel}/${entry.name}`, out);
    }
    return;
  }
  if (stat.isFile()) out.set(rel, readFileSync(abs, "utf8"));
}

function diffSnapshots(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].sort().filter((key) => before.get(key) !== after.get(key));
}
