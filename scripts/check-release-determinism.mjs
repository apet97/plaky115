#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withOwnedTempDirectory, withOwnedWorktree, linkPackageDependencies, runBoundedCommand, sanitizedEnvironment } from "./lib/verification-runner.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const packages = ["sdk", "mcp-server"];

export async function checkReleaseDeterminism(sourceRoot = root) {
  return withOwnedTempDirectory("plaky115-determinism-", async (temporaryRoot) => {
    const lanes = [];
    for (const lane of ["first", "second"]) {
      lanes.push(await withOwnedWorktree(sourceRoot, async (worktreeRoot) => {
        await linkPackageDependencies(sourceRoot, worktreeRoot);
        const output = join(temporaryRoot, lane);
        await mkdir(output, { recursive: true });
        const digests = [];
        for (const packageName of packages) {
          await runBoundedCommand(npmCommand(), ["--prefix", packageName, "run", "build"], {
            cwd: worktreeRoot,
            env: sanitizedEnvironment(),
            label: `determinism build ${lane} ${packageName}`,
          });
          const result = await runBoundedCommand(npmCommand(), ["pack", "--json", "--ignore-scripts", "--pack-destination", output], {
            cwd: join(worktreeRoot, packageName),
            env: sanitizedEnvironment(),
            label: `determinism pack ${lane} ${packageName}`,
          });
          const [entry] = JSON.parse(result.stdout);
          digests.push({ package: entry.name, version: entry.version, integrity: entry.integrity });
        }
        return digests;
      }, { env: sanitizedEnvironment() }));
    }
    if (JSON.stringify(lanes[0]) !== JSON.stringify(lanes[1])) throw new Error("two clean checkout npm packs are not deterministic");
    return { status: "deterministic", packages: lanes[0] };
  });
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const result = await checkReleaseDeterminism();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
