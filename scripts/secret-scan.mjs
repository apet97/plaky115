#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SECRET_PATTERN = /plk_[A-Za-z0-9_-]+/g;

// Reviewed exclusions only. `.live-artifacts` is intentionally absent.
const EXCLUDED_DIRECTORY_NAMES = new Set([
  ".git",
  ".cache",
  ".npm",
  ".pnpm-store",
  ".yarn",
  "node_modules",
  "coverage",
  "dist",
  "esm",
  "bin",
]);
const FORCED_DIRECTORY_NAMES = new Set([".live-artifacts"]);

function displayPath(root, path) {
  const value = relative(root, path).split(sep).join("/");
  return value || ".";
}

function gitIncludedFiles(root) {
  try {
    const gitRoot = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (realpathSync(gitRoot) !== realpathSync(root)) return null;

    const output = execFileSync(
      "git",
      ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { encoding: "buffer", stdio: ["ignore", "pipe", "ignore"] },
    );
    return new Set(output.toString("utf8").split("\0").filter(Boolean));
  } catch {
    return null;
  }
}

async function validateRoot(root) {
  try {
    const stats = await lstat(root);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    return true;
  } catch {
    return false;
  }
}

async function scan(root) {
  const findings = [];
  const failures = [];
  const includedFiles = gitIncludedFiles(root);

  function isForcedPath(path) {
    const value = displayPath(root, path);
    return FORCED_DIRECTORY_NAMES.has(value) || [...FORCED_DIRECTORY_NAMES].some((name) => value.startsWith(`${name}/`));
  }

  function mayContainIncludedFile(directory) {
    if (!includedFiles) return true;
    const prefix = displayPath(root, directory);
    if (prefix === ".") return true;
    if (isForcedPath(directory)) return true;
    const directoryPrefix = `${prefix}/`;
    for (const file of includedFiles) {
      if (file === prefix || file.startsWith(directoryPrefix)) return true;
    }
    return false;
  }

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      failures.push(displayPath(root, directory));
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name) && mayContainIncludedFile(path)) await walk(path);
        continue;
      }
      if (!entry.isFile()) continue;
      if (includedFiles && !includedFiles.has(displayPath(root, path)) && !isForcedPath(path)) continue;

      let bytes;
      try {
        bytes = await readFile(path);
      } catch {
        failures.push(displayPath(root, path));
        continue;
      }
      if (bytes.includes(0)) continue;

      const lines = bytes.toString("utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        const matches = lines[index].match(SECRET_PATTERN);
        if (matches) findings.push({ path: displayPath(root, path), line: index + 1, count: matches.length });
      }
    }
  }

  await walk(root);
  findings.sort((left, right) => left.path.localeCompare(right.path) || left.line - right.line);
  failures.sort((left, right) => left.localeCompare(right));
  return { findings, failures };
}

export async function runSecretScan(rootArgument) {
  const root = resolve(rootArgument ?? fileURLToPath(new URL("..", import.meta.url)));
  if (!(await validateRoot(root))) {
    console.error("secret-scan: invalid scan root");
    return 2;
  }

  const { findings, failures } = await scan(root);
  for (const finding of findings) {
    console.error(`${finding.path}:${finding.line}: count=${finding.count}`);
  }
  for (const path of failures) {
    console.error(`secret-scan: scan failed for ${path}`);
  }
  if (failures.length > 0) return 2;
  return findings.length > 0 ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runSecretScan(process.argv[2]);
}
