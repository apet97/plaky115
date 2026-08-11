#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error("openapi-standards: provide at least one OpenAPI file");
  process.exit(1);
}

try {
  const require = createRequire(join(root, "sdk/package.json"));
  const { createConfig, lintFromString } = require("@redocly/openapi-core");
  const config = await createConfig({ extends: ["recommended"] });
  const failures = [];

  for (const inputPath of paths) {
    const absolutePath = resolve(root, inputPath);
    const problems = await lintFromString({
      source: readFileSync(absolutePath, "utf8"),
      absoluteRef: absolutePath,
      config,
    });
    for (const problem of problems) {
      if (problem.severity !== "error" && problem.severity !== "fatal") continue;
      const pointers = (problem.location ?? [])
        .map((location) => location.pointer)
        .filter(Boolean);
      failures.push(`${absolutePath}${pointers.length ? ` ${pointers.join(" ")}` : ""}: ${problem.message}`);
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`openapi-standards: ${failure}`);
    process.exit(1);
  }

  console.log(`openapi-standards: OK (${paths.length} file${paths.length === 1 ? "" : "s"})`);
} catch (error) {
  console.error(`openapi-standards: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
