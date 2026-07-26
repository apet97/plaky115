#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const repositoryRoot = new URL("..", import.meta.url);

export async function buildContractInventory(metadata, rootUrl = repositoryRoot) {
  if (!Array.isArray(metadata?.operations)) {
    throw new TypeError("metadata.operations must be an array");
  }

  const operationIds = metadata.operations.map(({ operationId }) => operationId).sort();
  assertUnique(operationIds, "operationId");

  const methodPathKeys = metadata.operations
    .map(({ method, path }) => `${String(method).toUpperCase()} ${path}`)
    .sort();
  assertUnique(methodPathKeys, "method/path");

  return {
    operationCount: metadata.operations.length,
    operationIds,
    methodPathKeys,
    mutationCount: metadata.operations.filter(({ mutation }) => mutation === true).length,
    destructiveCount: metadata.operations.filter(({ destructive }) => destructive === true).length,
    rawSurfaceFileCounts: {
      cli: await countGeneratedOperationFiles(
        new URL("cli/internal/cli/raw/", rootUrl),
        ".go",
      ),
      mcp: await countGeneratedOperationFiles(
        new URL("mcp-server/src/tools/raw/", rootUrl),
        ".ts",
      ),
    },
  };
}

export function formatContractInventory(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
}

async function countGeneratedOperationFiles(directory, extension) {
  const entries = await readdir(directory, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(extension)) continue;
    const firstLine = (await readFile(new URL(entry.name, directory), "utf8")).split("\n", 1)[0];
    if (firstLine.includes("AUTO-GENERATED") && firstLine.includes("operationId=")) {
      count += 1;
    }
  }
  return count;
}

async function main() {
  const metadata = JSON.parse(
    await readFile(new URL("openapi/plaky115-operation-metadata.json", repositoryRoot), "utf8"),
  );
  process.stdout.write(formatContractInventory(await buildContractInventory(metadata)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
