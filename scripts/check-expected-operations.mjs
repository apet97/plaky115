#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const repositoryRoot = new URL("..", import.meta.url);

export function compareExpectedOperations(expectedInput, actualInput) {
  const expected = normalizeOperations(expectedInput, "expected");
  const actual = normalizeOperations(actualInput, "actual");
  validateUnique(expected, "expected");
  validateUnique(actual, "actual");

  const expectedKeys = new Set(expected.map(exactKey));
  const actualKeys = new Set(actual.map(exactKey));
  return {
    missing: expected.filter((operation) => !actualKeys.has(exactKey(operation))),
    unexpected: actual
      .filter((operation) => !expectedKeys.has(exactKey(operation)))
      .sort((left, right) => exactKey(left).localeCompare(exactKey(right))),
  };
}

function normalizeOperations(input, label) {
  const operations = Array.isArray(input) ? input : input?.operations;
  if (!Array.isArray(operations)) {
    throw new TypeError(`${label} operations must be an array`);
  }
  return operations.map(({ operationId, method, path }) => {
    if (![operationId, method, path].every((value) => typeof value === "string" && value)) {
      throw new TypeError(`${label} operation requires operationId, method, and path`);
    }
    return { operationId, method: method.toUpperCase(), path };
  });
}

function validateUnique(operations, label) {
  assertUnique(operations.map(({ operationId }) => operationId), `${label} operationId`);
  assertUnique(operations.map(methodPathKey), `${label} method/path`);
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function methodPathKey({ method, path }) {
  return `${method} ${path}`;
}

function exactKey({ operationId, method, path }) {
  return `${methodPathKey({ method, path })} ${operationId}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "allow-missing": { type: "boolean", default: false },
      actual: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  const expected = JSON.parse(
    await readFile(new URL("openapi/plaky115-expected-operations.json", repositoryRoot), "utf8"),
  );
  const actualUrl = values.actual
    ? pathToFileURL(values.actual)
    : new URL("openapi/plaky115-operation-metadata.json", repositoryRoot);
  const actual = JSON.parse(await readFile(actualUrl, "utf8"));
  const result = compareExpectedOperations(expected, actual);
  const diagnostic = {
    expectedCount: expected.operations.length,
    actualCount: normalizeOperations(actual, "actual").length,
    missingCount: result.missing.length,
    unexpectedCount: result.unexpected.length,
    missing: result.missing,
    unexpected: result.unexpected,
  };
  process.stdout.write(`${JSON.stringify(diagnostic, null, 2)}\n`);
  if (result.unexpected.length > 0 || (!values["allow-missing"] && result.missing.length > 0)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
