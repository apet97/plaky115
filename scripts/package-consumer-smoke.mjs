#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "plaky115-consumer-"));

try {
  const tarDir = join(tmp, "tarballs");
  const consumer = join(tmp, "consumer");
  mkdirSync(tarDir, { recursive: true });
  mkdirSync(consumer, { recursive: true });

  const sdkTar = pack("sdk", tarDir);
  const mcpTar = pack("mcp-server", tarDir);

  writeFileSync(join(consumer, "package.json"), `${JSON.stringify({ type: "module", private: true }, null, 2)}\n`);
  run("npm", ["install", "--silent", "--prefer-offline", "--no-audit", "--no-fund", sdkTar, mcpTar], {
    cwd: consumer,
  });

  run("node", [
    "--input-type=module",
    "-e",
    "import { PlakyClient, SpaceId } from 'plaky115'; const c = new PlakyClient({ apiKey: 'test' }); if (typeof c.spaces.list !== 'function') throw new Error('missing spaces.list'); if (SpaceId(1) !== 1) throw new Error('bad SpaceId');",
  ], { cwd: consumer });

  run("node", [
    "--input-type=module",
    "-e",
    "const sdk = await import('plaky115'); if (typeof sdk.PlakyClient !== 'function') throw new Error('missing PlakyClient'); const runtime = await import('plaky115/runtime/http.js'); if (typeof runtime.request !== 'function') throw new Error('missing runtime request');",
  ], { cwd: consumer });

  assertImportFails(consumer, "plaky115/operations/list-spaces.js");
  assertImportFails(consumer, "plaky115/generated/operations/list-spaces.js");

  run("node", [
    "--input-type=module",
    "-e",
    "import { buildServer } from 'plaky115-mcp'; if (typeof buildServer !== 'function') throw new Error('missing buildServer');",
  ], { cwd: consumer });

  run("node", ["node_modules/plaky115-mcp/bin/mcp-server.js", "--help"], { cwd: consumer });
  console.log("package-consumer-smoke: OK");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function pack(pkg, tarDir) {
  const stdout = run("npm", ["pack", "--json", "--pack-destination", tarDir], {
    cwd: join(root, pkg),
    stdout: "pipe",
  });
  const [entry] = JSON.parse(stdout);
  return join(tarDir, entry.filename);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.stdout === "pipe" ? ["ignore", "pipe", "pipe"] : "pipe",
  });
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${cmd} ${args.join(" ")} failed`);
  }
  return result.stdout ?? "";
}

function assertImportFails(cwd, specifier) {
  const result = spawnSync("node", ["--input-type=module", "-e", `await import(${JSON.stringify(specifier)});`], {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status === 0) {
    throw new Error(`${specifier} must not be importable from the published package`);
  }
  const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  if (!/ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_MODULE_NOT_FOUND|Cannot find package/.test(output)) {
    process.stderr.write(output);
    throw new Error(`${specifier} failed for an unexpected reason`);
  }
}
