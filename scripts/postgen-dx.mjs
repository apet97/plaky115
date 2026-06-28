#!/usr/bin/env node
// Minimal post-generation hook. The hand-crafted layout means most
// metadata is sourced from the package.json files directly; this script
// just enforces a few invariants (description, license, repository,
// exports) so they stay consistent across releases.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicRuntimeModules = [
  "errors",
  "http",
  "idempotency",
  "ids",
  "interceptors",
  "pagination",
  "rate-limit",
  "redact",
  "retries",
  "types",
  "user-agent",
];

function runtimeExport(name) {
  return {
    types: `./esm/runtime/${name}.d.ts`,
    import: `./esm/runtime/${name}.js`,
    default: `./esm/runtime/${name}.js`,
  };
}

function syncPackageMetadata(file, mutate) {
  const before = readFileSync(file, "utf8");
  const pkg = JSON.parse(before);
  mutate(pkg);
  const after = `${JSON.stringify(pkg, null, 2)}\n`;
  if (before !== after) writeFileSync(file, after);
}

syncPackageMetadata(join(root, "sdk/package.json"), (pkg) => {
  pkg.description = "Hand-crafted TypeScript SDK for the Plaky public API. Unofficial.";
  pkg.license = "MIT";
  pkg.repository = pkg.repository ?? { type: "git", url: "https://github.com/apet97/plaky115" };
  // Hand-crafted SDK only exports the public client and runtime utilities.
  pkg.exports = {
    ".": {
      types: "./esm/index.d.ts",
      import: "./esm/index.js",
      default: "./esm/index.js",
    },
    ...Object.fromEntries(publicRuntimeModules.map((name) => [`./runtime/${name}.js`, runtimeExport(name)])),
    "./package.json": "./package.json",
  };
});

syncPackageMetadata(join(root, "mcp-server/package.json"), (pkg) => {
  pkg.description = "Hand-crafted MCP server for the Plaky public API. Unofficial.";
  pkg.license = "MIT";
  pkg.repository = pkg.repository ?? { type: "git", url: "https://github.com/apet97/plaky115" };
  pkg.exports = {
    ".": {
      types: "./esm/server/index.d.ts",
      import: "./esm/server/index.js",
      default: "./esm/server/index.js",
    },
    "./package.json": "./package.json",
  };
});

console.log("postgen-dx: package metadata synced");
