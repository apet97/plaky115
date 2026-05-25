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
