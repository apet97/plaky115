#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { bunCommand } from "./lib/bun-command.mjs";

const result = spawnSync(bunCommand(process.cwd()), process.argv.slice(2), { stdio: "inherit" });
if (result.error) {
  console.error(`unable to start Bun: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
