#!/usr/bin/env node

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

function displayPath(root, path) {
  const value = relative(root, path).split(sep).join("/");
  return value || ".";
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
        if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) await walk(path);
        continue;
      }
      if (!entry.isFile()) continue;

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
