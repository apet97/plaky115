#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const r = spawnSync("npm", ["run", "generate:all"], { stdio: "inherit" });
process.exit(r.status ?? 0);
