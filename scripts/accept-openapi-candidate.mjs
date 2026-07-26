#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  assertExpectedOperations,
  validateUpstreamManifestShape,
} from "./check-upstream-manifest.mjs";
import {
  canonicalJson,
  operationInventory,
  parseOpenApiSource,
} from "./lib/openapi-source-parser.mjs";

export async function acceptOpenApiCandidate(options = {}) {
  if (!options.yes) throw new Error("candidate acceptance requires --yes");
  const candidateDir = options.candidateDir ?? ".contract-candidate/current";
  const upstreamPath = options.upstreamPath ?? "api-1.yaml";
  const manifestPath = options.manifestPath ?? "openapi/upstream-manifest.json";
  const expectedPath = options.expectedPath ?? "openapi/plaky115-expected-operations.json";
  const now = options.now ?? (() => new Date());

  const raw = await readFile(join(candidateDir, "raw-source"));
  const canonical = await readFile(join(candidateDir, "canonical.json"));
  const candidate = await readFile(join(candidateDir, "candidate.yaml"));
  const provenance = JSON.parse(await readFile(join(candidateDir, "provenance.json"), "utf8"));
  validateUpstreamManifestShape(provenance, { accepted: false });
  if (sha256(raw) !== provenance.rawSha256) throw new Error("candidate raw SHA-256 mismatch");
  if (sha256(canonical) !== provenance.canonicalSha256) throw new Error("candidate canonical SHA-256 mismatch");

  const canonicalDocument = await parseOpenApiSource(canonical.toString("utf8"), "application/json");
  const yamlDocument = await parseOpenApiSource(candidate.toString("utf8"), "application/yaml");
  if (canonicalJson(canonicalDocument) !== canonicalJson(yamlDocument)) {
    throw new Error("candidate YAML is not semantically equal to canonical JSON");
  }
  const methodPathKeys = operationInventory(yamlDocument).map(({ method, path }) => `${method} ${path}`).sort();
  if (methodPathKeys.length !== provenance.operationCount
    || JSON.stringify(methodPathKeys) !== JSON.stringify(provenance.methodPathKeys)) {
    throw new Error("candidate provenance operation inventory mismatch");
  }
  await assertExpectedOperations(methodPathKeys, expectedPath);

  const manifest = {
    ...provenance,
    acceptedAt: now().toISOString(),
    acceptedSha256: sha256(candidate),
  };
  validateUpstreamManifestShape(manifest, { accepted: true });
  await writeAtomic(upstreamPath, candidate);
  await writeAtomic(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { operationCount: methodPathKeys.length, methodPathKeys, manifest };
}

async function writeAtomic(path, contents) {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true });
  const stageDirectory = await mkdtemp(join(directory, ".accept-"));
  const stage = join(stageDirectory, basename(path));
  try {
    await writeFile(stage, contents);
    await rename(stage, path);
  } finally {
    await rm(stageDirectory, { recursive: true, force: true });
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function printHelp() {
  process.stdout.write("Usage: accept-openapi-candidate.mjs --yes [--candidate-dir PATH] [--upstream PATH] [--manifest PATH] [--expected PATH]\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      yes: { type: "boolean", default: false },
      "candidate-dir": { type: "string", default: ".contract-candidate/current" },
      upstream: { type: "string", default: "api-1.yaml" },
      manifest: { type: "string", default: "openapi/upstream-manifest.json" },
      expected: { type: "string", default: "openapi/plaky115-expected-operations.json" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return printHelp();
  const result = await acceptOpenApiCandidate({
    yes: values.yes,
    candidateDir: values["candidate-dir"],
    upstreamPath: values.upstream,
    manifestPath: values.manifest,
    expectedPath: values.expected,
  });
  process.stdout.write(`accepted upstream operations=${result.operationCount}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "candidate acceptance failed");
    process.exitCode = 1;
  }
}
