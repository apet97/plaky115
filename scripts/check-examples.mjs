#!/usr/bin/env node
// Offline syntax and packaged-MCP help gate for runnable examples. The MCP host
// is started only with --help under a scrubbed environment, so this check never
// needs PLAKY115_API_KEY or a network request.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
let failed = false;

function check(label, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    console.error(`syntax error in ${label}:\n${result.stderr || result.stdout}`);
  } else {
    console.log(`ok ${label}`);
  }
}

const sdkDir = join(root, "examples/sdk");
for (const entry of readdirSync(sdkDir).filter((f) => f.endsWith(".mjs")).sort()) {
  check(`examples/sdk/${entry}`, process.execPath, ["--check", join(sdkDir, entry)]);
}

check("examples/cli/recipes.sh", "bash", ["-n", join(root, "examples/cli/recipes.sh")]);

checkMcpExample();

if (failed) process.exit(1);
console.log("check-examples OK");

function checkMcpExample() {
  const configPath = join(root, "examples/mcp/claude_desktop_config.json");
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    failed = true;
    console.error(`invalid MCP example config: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const server = config?.mcpServers?.plaky115;
  const args = server?.args;
  if (server?.command !== "npx" || !Array.isArray(args)) {
    failed = true;
    console.error("MCP example must use the npx package command");
    return;
  }
  const separator = args.indexOf("--");
  const packageIndex = args.indexOf("--package");
  const configuredPackage = packageIndex >= 0 ? args[packageIndex + 1] : undefined;
  const mcpIndex = separator >= 0 ? args.indexOf("mcp", separator + 1) : -1;
  if (separator < 0 || packageIndex < 0 || mcpIndex < 0 || configuredPackage !== "/absolute/path/to/mcp-server") {
    failed = true;
    console.error("MCP example must resolve one local package and the mcp binary");
    return;
  }
  const runtimeArgs = args.slice(mcpIndex + 1);
  if (runtimeArgs.includes("start") || runtimeArgs.some((value) => value === "--")) {
    failed = true;
    console.error("MCP example contains an unsupported positional command");
    return;
  }

  const packageRoot = resolve(root, "mcp-server");
  const binary = join(packageRoot, "bin/mcp-server.js");
  if (!existsSync(binary)) {
    if (!runBuild("sdk", ["run", "build"]) || !runBuild("mcp-server", ["run", "build"])) return;
  }
  if (!existsSync(binary)) {
    failed = true;
    console.error("MCP example binary was not produced");
    return;
  }

  const environment = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    PLAKY115_API_KEY: "",
    PLAKY115_API_KEY_AUTH: "",
    PLAKY115_BASE_URL: "",
  };
  const result = spawnSync(process.execPath, [binary, ...runtimeArgs, "--help"], {
    cwd: packageRoot,
    encoding: "utf8",
    env: environment,
    timeout: 10_000,
    maxBuffer: 64 * 1024,
  });
  if (result.status !== 0 || result.signal !== null) {
    failed = true;
    console.error(`MCP example failed to boot offline:\n${result.stderr || result.stdout}`);
    return;
  }
  if (!result.stdout.includes("PLAKY115_BASE_URL") || !result.stdout.includes("--server-url")) {
    failed = true;
    console.error("MCP help does not document host selection");
    return;
  }
  console.log("ok examples/mcp/claude_desktop_config.json (--help)");
}

function runBuild(packageName, args) {
  const result = spawnSync("npm", ["--prefix", packageName, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024,
  });
  if (result.status === 0) return true;
  failed = true;
  console.error(`${packageName} build failed:\n${result.stderr || result.stdout}`);
  return false;
}
