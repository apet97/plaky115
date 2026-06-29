#!/usr/bin/env node
// Offline syntax gate for the runnable examples. `node --check` parses every SDK
// example (without resolving imports, so no install/build is needed) and `bash -n`
// parses the CLI recipe script. Keeps examples/ from silently rotting without
// needing PLAKY115_API_KEY or a network.
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
let failed = false;

function check(label, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    console.error(`syntax error in ${label}:\n${result.stderr || result.stdout}`);
  } else {
    console.log(`ok ${label}`);
  }
}

const sdkDir = join(root, "examples/sdk");
for (const entry of readdirSync(sdkDir).filter((f) => f.endsWith(".mjs")).sort()) {
  check(`examples/sdk/${entry}`, process.execPath, ["--check", join(sdkDir, entry)]);
}

check("examples/cli/recipes.sh", "bash", ["-n", join(root, "examples/cli/recipes.sh")]);

if (failed) process.exit(1);
console.log("check-examples OK");
