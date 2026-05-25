#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const input = join(root, "openapi/plaky115-dx.openapi.yaml");
const output = join(root, "sdk/src/generated/types.ts");

mkdirSync(dirname(output), { recursive: true });

const bin = join(root, "sdk/node_modules/.bin/openapi-typescript");
const result = spawnSync(
  bin,
  [input, "--output", output, "--alphabetize", "--immutable"],
  { stdio: "inherit", cwd: root }
);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const header = `// AUTO-GENERATED FILE. Do not edit by hand.\n// Source: openapi/plaky115-dx.openapi.yaml\n// Regenerate: npm run generate:types\n\n`;
const body = readFileSync(output, "utf8");
if (!body.startsWith("// AUTO-GENERATED FILE")) {
  writeFileSync(output, header + body);
}
console.log(`generate-types: wrote ${output}`);
