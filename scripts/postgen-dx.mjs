#!/usr/bin/env node
// Minimal post-generation hook. The hand-crafted layout means most
// metadata is sourced from the package.json files directly; this script
// just enforces a few invariants (description, license, repository,
// exports) so they stay consistent across releases.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGenerationOptions } from "./lib/generation-options.mjs";
import { publicRuntimeModules } from "./lib/sdk-runtime-modules.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const options = parseGenerationOptions(process.argv.slice(2), root);

function runtimeExport(name) {
  return {
    types: `./esm/runtime/${name}.d.ts`,
    import: `./esm/runtime/${name}.js`,
    default: `./esm/runtime/${name}.js`,
  };
}

function syncPackageMetadata(file, mutate, outputFile = file) {
  const before = readFileSync(file, "utf8");
  const pkg = JSON.parse(before);
  mutate(pkg);
  const after = `${JSON.stringify(pkg, null, 2)}\n`;
  if (outputFile !== file || before !== after) {
    mkdirSync(dirname(outputFile), { recursive: true });
    writeFileSync(outputFile, after);
  }
}

syncPackageMetadata(join(options.sourceRoot, "sdk/package.json"), (pkg) => {
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
}, join(options.outputRoot, "sdk/package.json"));

syncPackageMetadata(join(options.sourceRoot, "mcp-server/package.json"), (pkg) => {
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
}, join(options.outputRoot, "mcp-server/package.json"));

console.log("postgen-dx: package metadata synced");
