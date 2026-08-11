#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
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
export const MAX_CANDIDATE_BYTES = 16 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const TOTAL_TIMEOUT_MS = 30_000;
const REVIEWED_SOURCE_HOSTS = new Set(["docs.plaky.com", "cdn.plaky.com"]);
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
    requestedUrl: source.requestedUrl,
    finalUrl: source.finalUrl,
    redirectChain: source.redirectChain,
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
  let currentUrl = validateRemoteSourceUrl(sourceUrl);
  const requestedUrl = currentUrl.href;
  const redirectChain = [];
  const visited = new Set();
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  for (let redirectCount = 0; ; redirectCount += 1) {
    if (visited.has(currentUrl.href)) throw new Error("OpenAPI fetch failed: redirect loop");
    visited.add(currentUrl.href);
    if (Date.now() >= deadline) throw new Error("OpenAPI fetch failed: timed out");

    const attempt = new AbortController();
    const remaining = Math.min(REQUEST_TIMEOUT_MS, deadline - Date.now());
    const timer = setTimeout(() => attempt.abort(new Error("timed out")), remaining);
    let response;
    try {
      response = await raceWithSignal(fetchImpl(currentUrl.href, {
        redirect: "manual",
        signal: attempt.signal,
        headers: { accept: "application/json, application/yaml, text/yaml, text/html;q=0.9" },
      }), attempt.signal);

      const status = Number(response?.status);
      if (isRedirect(status)) {
        if (redirectCount >= MAX_REDIRECTS) throw new Error("redirect limit exceeded");
        const location = responseHeader(response, "location");
        if (!location) throw new Error("redirect response is missing Location");
        const nextUrl = validateRemoteSourceUrl(new URL(location, currentUrl).href);
        redirectChain.push({ from: currentUrl.href, to: nextUrl.href, status });
        await cancelResponseBody(response);
        currentUrl = nextUrl;
        continue;
      }
      if (!Number.isInteger(status) || status < 200 || status >= 300) {
        throw new Error(`HTTP ${status}`);
      }

      const contentType = responseHeader(response, "content-type") ?? "application/octet-stream";
      if (!isSupportedContentType(contentType)) {
        throw new Error(`unsupported response content type: ${contentType}`);
      }
      const raw = await readBoundedResponse(response, attempt.signal);
      return {
        sourceUrl: currentUrl.href,
        requestedUrl,
        finalUrl: currentUrl.href,
        redirectChain,
        httpStatus: status,
        contentType,
        raw,
        text: raw.toString("utf8"),
      };
    } catch (error) {
      throw new Error(`OpenAPI fetch failed: ${error instanceof Error ? error.message : "request failed"}`);
    } finally {
      clearTimeout(timer);
      if (response && isRedirect(Number(response.status))) await cancelResponseBody(response);
    }
  }
}

async function readFileSource(path) {
  const details = await stat(path);
  if (details.size > MAX_CANDIDATE_BYTES) throw new Error(`OpenAPI source exceeds ${MAX_CANDIDATE_BYTES} byte limit`);
  const raw = await readFile(path);
  if (raw.byteLength > MAX_CANDIDATE_BYTES) throw new Error(`OpenAPI source exceeds ${MAX_CANDIDATE_BYTES} byte limit`);
  const sourceUrl = pathToFileURL(path).href;
  return {
    sourceUrl,
    requestedUrl: sourceUrl,
    finalUrl: sourceUrl,
    redirectChain: [],
    httpStatus: 200,
    contentType: contentTypeForFile(path),
    raw,
    text: raw.toString("utf8"),
  };
}

function validateRemoteSourceUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("source URL is invalid");
  }
  if (url.protocol !== "https:") throw new Error("source URL must use HTTPS");
  if (url.username || url.password) throw new Error("source URL must not contain credentials");
  if (url.search || url.hash) throw new Error("source URL must not contain a query or fragment");
  if (!REVIEWED_SOURCE_HOSTS.has(url.hostname)) throw new Error(`source host is not reviewed: ${url.hostname}`);
  return url;
}

function isRedirect(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

function responseHeader(response, name) {
  if (typeof response?.headers?.get === "function") return response.headers.get(name);
  if (response?.headers && typeof response.headers[name] === "string") return response.headers[name];
  return null;
}

function isSupportedContentType(contentType) {
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json"
    || mediaType.endsWith("+json")
    || mediaType === "application/yaml"
    || mediaType === "application/x-yaml"
    || mediaType === "text/yaml"
    || mediaType === "text/x-yaml"
    || mediaType === "text/html";
}

async function readBoundedResponse(response, signal) {
  const contentLength = responseHeader(response, "content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      throw new Error("response content length is invalid");
    }
    if (declaredLength > MAX_CANDIDATE_BYTES) {
      throw new Error(`response exceeds ${MAX_CANDIDATE_BYTES} byte limit`);
    }
  }
  if (!response?.body || typeof response.body.getReader !== "function") {
    throw new Error("response body stream is unavailable");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  let completed = false;
  try {
    while (true) {
      const result = await raceWithSignal(reader.read(), signal);
      if (result.done) {
        completed = true;
        return Buffer.concat(chunks, total);
      }
      const chunk = Buffer.from(result.value);
      total += chunk.byteLength;
      if (total > MAX_CANDIDATE_BYTES) throw new Error(`response exceeds ${MAX_CANDIDATE_BYTES} byte limit`);
      chunks.push(chunk);
    }
  } finally {
    if (!completed) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function cancelResponseBody(response) {
  if (typeof response?.body?.cancel === "function") await response.body.cancel().catch(() => {});
}

function raceWithSignal(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error("timed out"));
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason ?? new Error("timed out")), { once: true });
    }),
  ]);
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
  process.stdout.write(`Usage: ${basename(process.argv[1])} [--file PATH] [--source-url URL]\n\n`);
  process.stdout.write("Fetch or import the official Plaky OpenAPI candidate into .contract-candidate/current/.\n");
  process.stdout.write(`Remote source default: ${DEFAULT_SOURCE_URL}\n`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      "source-url": { type: "string" },
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
    const result = await acquireOpenApiCandidate({ file: values.file, sourceUrl: values["source-url"] });
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
