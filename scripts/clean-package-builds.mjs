#!/usr/bin/env node
import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = process.argv[2];
if (!["sdk", "mcp-server"].includes(pkg)) {
  console.error("usage: node scripts/clean-package-builds.mjs <sdk|mcp-server>");
  process.exit(2);
}
const root = fileURLToPath(new URL("..", import.meta.url));
rmSync(join(root, pkg, "esm"), { recursive: true, force: true });
if (pkg === "mcp-server") {
  rmSync(join(root, pkg, "bin", "mcp-server.js"), { force: true });
}
