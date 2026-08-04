#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isIsolatedGeneration, parseGenerationOptions } from "./lib/generation-options.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const options = parseGenerationOptions(process.argv.slice(2), root);
const isolated = isIsolatedGeneration(options);
const derivedOpenApi = join(options.outputRoot, "openapi/plaky115-dx.openapi.yaml");
const metadata = join(options.outputRoot, "openapi/plaky115-operation-metadata.json");

mkdirSync(options.outputRoot, { recursive: true });

const steps = [
  ["ruby", ["scripts/apply-overlay.rb", "--source", join(options.sourceRoot, "api-1.yaml"), "--overlay", join(options.sourceRoot, "overlays/plaky115-dx.overlay.yaml"), "--out", derivedOpenApi]],
];
if (!isolated) {
  steps.push(["npm", ["run", "lint:openapi"]]);
  steps.push(["npm", ["run", "openapi:test"]]);
}
steps.push(["ruby", ["scripts/generate-operation-metadata.rb", "--source", derivedOpenApi, "--source-label", "openapi/plaky115-dx.openapi.yaml", "--out", metadata]]);
if (!isolated) steps.push(["npm", ["run", "metadata:test"]]);
steps.push(
  ["node", ["scripts/generate-types.mjs", "--source-root", options.sourceRoot, "--output-root", options.outputRoot]],
  ["node", ["scripts/generate-mcp.mjs", "--source-root", options.sourceRoot, "--output-root", options.outputRoot]],
  ["node", ["scripts/generate-cli.mjs", "--source-root", options.sourceRoot, "--output-root", options.outputRoot]],
  ["node", ["scripts/generate-docs-index.mjs", "--source-root", options.sourceRoot, "--output-root", options.outputRoot]],
);
if (!isolated) steps.push(["npm", ["run", "test:surfaces"]]);

for (const [cmd, ...args] of steps) {
  const commandArgs = Array.isArray(args[0]) ? args[0] : args;
  console.log(`$ ${cmd} ${commandArgs.join(" ")}`);
  const r = spawnSync(cmd, commandArgs, { stdio: "inherit", cwd: root });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(`generate-all: OK (${isolated ? "isolated" : "in-place"})`);
