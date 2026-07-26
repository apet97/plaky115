#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  canonicalJson,
  operationInventory,
  parseOpenApiSource,
  writeOpenApiYaml,
} from "./lib/openapi-source-parser.mjs";

const repositoryRoot = new URL("..", import.meta.url);
const DEFAULT_SOURCE_URL = "https://docs.plaky.com/";
const REQUIRED_NEW_OPERATION_IDS = new Set([
  "listItemGroups",
  "getItemGroup",
  "createItemGroup",
  "updateItemGroup",
  "deleteItemGroup",
  "archiveItemGroup",
  "uploadItemFile",
  "listItemFiles",
  "getItemFile",
  "getItemFileDownload",
  "updateItemFile",
  "deleteItemFile",
]);

export async function acquireOpenApiCandidate(options = {}) {
  const candidateParent = options.candidateParent
    ?? fileURLToPath(new URL(".contract-candidate/", repositoryRoot));
  const now = options.now ?? (() => new Date());
  const source = options.file
    ? await readFileSource(options.file)
    : await fetchSource({
      fetchImpl: options.fetchImpl ?? globalThis.fetch,
      sourceUrl: options.sourceUrl
        ?? process.env.PLAKY115_OPENAPI_SOURCE_URL
        ?? DEFAULT_SOURCE_URL,
    });

  const document = await parseOpenApiSource(source.text, source.contentType);
  const canonical = canonicalJson(document);
  const yaml = await writeOpenApiYaml(document);
  const operations = operationInventory(document);
  const methodPathKeys = operations.map(({ method, path }) => `${method} ${path}`).sort();
  const required = await requiredNewOperations();
  const actualKeys = new Set(methodPathKeys);
  const missing = required.filter(({ method, path }) => !actualKeys.has(`${method} ${path}`));

  const provenance = {
    sourceUrl: source.sourceUrl,
    fetchedAt: now().toISOString(),
    httpStatus: source.httpStatus,
    contentType: source.contentType,
    rawSha256: sha256(source.raw),
    canonicalSha256: sha256(Buffer.from(canonical, "utf8")),
    info: {
      title: document.info?.title ?? null,
      version: document.info?.version ?? null,
    },
    operationCount: operations.length,
    methodPathKeys,
  };

  await replaceCandidateDirectory(candidateParent, {
    "raw-source": source.raw,
    "canonical.json": canonical,
    "candidate.yaml": yaml,
    "provenance.json": `${JSON.stringify(provenance, null, 2)}\n`,
  });

  return {
    exitCode: missing.length > 0 ? 3 : 0,
    missing,
    unexpected: [],
    provenance,
  };
}

async function fetchSource({ fetchImpl, sourceUrl }) {
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable");
  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
      headers: { accept: "application/json, application/yaml, text/yaml, text/html;q=0.9" },
    });
  } catch (error) {
    throw new Error(`OpenAPI fetch failed: ${error instanceof Error ? error.message : "request failed"}`);
  }
  if (!response.ok) {
    throw new Error(`OpenAPI fetch failed with HTTP ${response.status}`);
  }
  const raw = typeof response.arrayBuffer === "function"
    ? Buffer.from(await response.arrayBuffer())
    : Buffer.from(await response.text(), "utf8");
  return {
    sourceUrl,
    httpStatus: response.status,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    raw,
    text: raw.toString("utf8"),
  };
}

async function readFileSource(path) {
  const raw = await readFile(path);
  return {
    sourceUrl: pathToFileURL(path).href,
    httpStatus: 200,
    contentType: contentTypeForFile(path),
    raw,
    text: raw.toString("utf8"),
  };
}

function contentTypeForFile(path) {
  switch (extname(path).toLowerCase()) {
    case ".json": return "application/json";
    case ".yaml":
    case ".yml": return "application/yaml";
    case ".html":
    case ".htm": return "text/html";
    default: return "application/octet-stream";
  }
}

async function requiredNewOperations() {
  const manifest = JSON.parse(
    await readFile(new URL("openapi/plaky115-expected-operations.json", repositoryRoot), "utf8"),
  );
  return manifest.operations
    .filter(({ operationId }) => REQUIRED_NEW_OPERATION_IDS.has(operationId))
    .map(({ operationId, method, path }) => ({ operationId, method, path }));
}

async function replaceCandidateDirectory(parent, files) {
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(join(parent, ".next-"));
  try {
    for (const [name, contents] of Object.entries(files)) {
      await writeFile(join(stage, name), contents);
    }
    await replaceDirectory(join(parent, "current"), stage, parent);
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  }
}

async function replaceDirectory(current, stage, parent) {
  const backup = join(parent, `.previous-${process.pid}-${Date.now()}`);
  let movedCurrent = false;
  try {
    await access(current);
    await rename(current, backup);
    movedCurrent = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    await rename(stage, current);
  } catch (error) {
    if (movedCurrent) await rename(backup, current);
    throw error;
  }
  if (movedCurrent) await rm(backup, { recursive: true, force: true });
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function printHelp() {
  process.stdout.write(`Usage: ${basename(process.argv[1])} [--file PATH]\n\n`);
  process.stdout.write("Fetch or import the official Plaky OpenAPI candidate into .contract-candidate/current/.\n");
  process.stdout.write("Environment: PLAKY115_OPENAPI_SOURCE_URL overrides https://docs.plaky.com/.\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) {
    printHelp();
    return;
  }
  try {
    const result = await acquireOpenApiCandidate({ file: values.file });
    process.stdout.write(
      `candidate operations=${result.provenance.operationCount} missingRequired=${result.missing.length}\n`,
    );
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "OpenAPI candidate acquisition failed");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
