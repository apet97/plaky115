#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const repositoryRoot = new URL("..", import.meta.url);
const expectedRepository = "apet97/plaky115";
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function isExactSemVer(version) {
  if (typeof version !== "string" || !semverPattern.test(version)) return false;
  const prerelease = version.match(/-([^+]+)/)?.[1];
  return prerelease === undefined || prerelease.split(".").every((identifier) => !/^0\d+$/.test(identifier));
}

export async function checkReleaseVersion({
  tag,
  sdkPackage,
  mcpPackage,
  registryPreflight = false,
  runCommand = npmView,
}) {
  if (typeof tag !== "string" || !tag.startsWith("v") || !isExactSemVer(tag.slice(1))) {
    throw new Error("release tag must match v<semver>");
  }
  const version = tag.slice(1);
  const packages = [sdkPackage, mcpPackage];
  for (const manifest of packages) validateManifest(manifest);
  if (sdkPackage.version !== mcpPackage.version) {
    throw new Error(`package versions differ: ${sdkPackage.version} != ${mcpPackage.version}`);
  }
  if (version !== sdkPackage.version) {
    throw new Error(`tag ${tag} does not match package version ${sdkPackage.version}`);
  }

  if (registryPreflight) {
    for (const manifest of packages) {
      const result = await runCommand(manifest.name, manifest.version);
      if (result.status === 0) {
        throw new Error(`${manifest.name}@${manifest.version} already exists on npm`);
      }
      if (!/\bE404\b/.test(result.stderr)) {
        throw new Error(`${manifest.name}@${manifest.version} registry preflight was ambiguous`);
      }
    }
  }

  return { tag, version, packages: packages.map(({ name }) => name) };
}

function validateManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || typeof manifest.name !== "string") {
    throw new Error("release package manifest is invalid");
  }
  if (!isExactSemVer(manifest.version)) {
    throw new Error(`${manifest.name} has an invalid package version`);
  }
  const repositoryUrl = typeof manifest.repository === "string"
    ? manifest.repository
    : manifest.repository?.url;
  if (resolveRepository(repositoryUrl) !== expectedRepository) {
    throw new Error(`${manifest.name} repository must resolve exactly to ${expectedRepository}`);
  }
}

function resolveRepository(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/^git\+/, "").replace(/\.git\/?$/, "").replace(/\/$/, "");
  try {
    const url = new URL(normalized);
    if (url.hostname !== "github.com") return null;
    return url.pathname.replace(/^\//, "");
  } catch {
    return null;
  }
}

function npmView(name, version) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["view", `${name}@${version}`, "version", "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function main() {
  const { values } = parseArgs({
    options: {
      tag: { type: "string" },
      offline: { type: "boolean", default: false },
      "registry-preflight": { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (!values.tag) throw new Error("--tag is required");
  if (values.offline && values["registry-preflight"]) {
    throw new Error("--offline and --registry-preflight are mutually exclusive");
  }
  const [sdkPackage, mcpPackage] = await Promise.all([
    readPackage("sdk/package.json"),
    readPackage("mcp-server/package.json"),
  ]);
  const result = await checkReleaseVersion({
    tag: values.tag,
    sdkPackage,
    mcpPackage,
    registryPreflight: values["registry-preflight"],
  });
  process.stdout.write(`${JSON.stringify({ status: "ok", mode: values.offline ? "offline" : "registry", ...result })}\n`);
}

async function readPackage(path) {
  return JSON.parse(await readFile(new URL(path, repositoryRoot), "utf8"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
