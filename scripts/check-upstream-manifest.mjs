#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  canonicalJson,
  operationInventory,
  parseOpenApiSource,
} from "./lib/openapi-source-parser.mjs";

const SHA256 = /^[a-f0-9]{64}$/;
const REQUIRED_PROVENANCE_FIELDS = [
  "sourceUrl", "fetchedAt", "httpStatus", "contentType", "rawSha256",
  "canonicalSha256", "info", "operationCount", "methodPathKeys",
];

export async function checkUpstreamManifest(options = {}) {
  const upstreamPath = options.upstreamPath ?? "api-1.yaml";
  const manifestPath = options.manifestPath ?? "openapi/upstream-manifest.json";
  const expectedPath = options.expectedPath ?? "openapi/plaky115-expected-operations.json";
  const upstreamBytes = await readFile(upstreamPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  validateUpstreamManifestShape(manifest, { accepted: true });
  if (sha256(upstreamBytes) !== manifest.acceptedSha256) {
    throw new Error("accepted upstream SHA-256 mismatch");
  }

  const document = await parseOpenApiSource(upstreamBytes.toString("utf8"), "application/yaml");
  if (sha256(Buffer.from(canonicalJson(document))) !== manifest.canonicalSha256) {
    throw new Error("accepted upstream canonical SHA-256 mismatch");
  }
  const methodPathKeys = operationInventory(document).map(methodPathKey).sort();
  if (methodPathKeys.length !== manifest.operationCount) {
    throw new Error("accepted upstream operation count mismatch");
  }
  if (JSON.stringify(methodPathKeys) !== JSON.stringify(manifest.methodPathKeys)) {
    throw new Error("accepted upstream method/path inventory mismatch");
  }
  await assertExpectedOperations(methodPathKeys, expectedPath);
  return { operationCount: methodPathKeys.length, methodPathKeys, manifest };
}

export function validateUpstreamManifestShape(manifest, { accepted }) {
  if (!isObject(manifest)) throw new Error("upstream manifest must be an object");
  for (const field of REQUIRED_PROVENANCE_FIELDS) {
    if (!(field in manifest)) throw new Error(`upstream manifest missing field: ${field}`);
  }
  if (accepted) {
    for (const field of ["acceptedAt", "acceptedSha256"]) {
      if (!(field in manifest)) throw new Error(`upstream manifest missing field: ${field}`);
    }
  }
  if (typeof manifest.sourceUrl !== "string" || !manifest.sourceUrl) throw new Error("invalid sourceUrl");
  if (!isDateTime(manifest.fetchedAt)) throw new Error("invalid fetchedAt");
  if (!Number.isInteger(manifest.httpStatus) || manifest.httpStatus < 200 || manifest.httpStatus > 299) {
    throw new Error("invalid httpStatus");
  }
  if (typeof manifest.contentType !== "string" || !manifest.contentType) throw new Error("invalid contentType");
  for (const field of ["rawSha256", "canonicalSha256"]) {
    if (!SHA256.test(manifest[field])) throw new Error(`invalid ${field}`);
  }
  if (!isObject(manifest.info) || !("title" in manifest.info) || !("version" in manifest.info)) {
    throw new Error("invalid info provenance");
  }
  if (!Number.isInteger(manifest.operationCount) || manifest.operationCount < 0) {
    throw new Error("invalid operationCount");
  }
  if (!Array.isArray(manifest.methodPathKeys)
    || manifest.methodPathKeys.some((key) => typeof key !== "string")
    || new Set(manifest.methodPathKeys).size !== manifest.methodPathKeys.length
    || JSON.stringify([...manifest.methodPathKeys].sort()) !== JSON.stringify(manifest.methodPathKeys)) {
    throw new Error("invalid methodPathKeys");
  }
  if (accepted) {
    if (!isDateTime(manifest.acceptedAt)) throw new Error("invalid acceptedAt");
    if (!SHA256.test(manifest.acceptedSha256)) throw new Error("invalid acceptedSha256");
  }
}

export async function assertExpectedOperations(actualKeys, expectedPath) {
  const expected = JSON.parse(await readFile(expectedPath, "utf8"));
  const expectedKeys = expected.operations.map(methodPathKey);
  const actual = new Set(actualKeys);
  for (const key of expectedKeys) {
    if (!actual.has(key)) throw new Error(`missing expected operation: ${key}`);
  }
  const expectedSet = new Set(expectedKeys);
  for (const key of actualKeys) {
    if (!expectedSet.has(key)) throw new Error(`unexpected upstream operation: ${key}`);
  }
}

function methodPathKey({ method, path }) {
  return `${method.toUpperCase()} ${path}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isDateTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function printHelp() {
  process.stdout.write("Usage: check-upstream-manifest.mjs [--upstream PATH] [--manifest PATH] [--expected PATH]\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      upstream: { type: "string", default: "api-1.yaml" },
      manifest: { type: "string", default: "openapi/upstream-manifest.json" },
      expected: { type: "string", default: "openapi/plaky115-expected-operations.json" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return printHelp();
  const result = await checkUpstreamManifest({
    upstreamPath: values.upstream,
    manifestPath: values.manifest,
    expectedPath: values.expected,
  });
  process.stdout.write(`upstream manifest OK: operations=${result.operationCount}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "upstream manifest check failed");
    process.exitCode = 1;
  }
}
