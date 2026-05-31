#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  ["npm", "run", "overlay:apply"],
  ["npm", "run", "lint:openapi"],
  ["npm", "run", "openapi:test"],
  ["npm", "run", "metadata:generate"],
  ["npm", "run", "metadata:test"],
  ["npm", "run", "generate:types"],
  ["npm", "run", "generate:mcp"],
  ["npm", "run", "generate:cli"],
  ["npm", "run", "generate:docs-index"],
  ["npm", "run", "test:surfaces"],
];
for (const [cmd, ...args] of steps) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log("generate-all: OK");
