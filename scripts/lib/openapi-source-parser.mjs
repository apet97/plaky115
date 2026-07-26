import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = new URL("../..", import.meta.url);
const HTTP_METHODS = new Set(["get", "put", "post", "delete", "patch", "options", "head", "trace"]);
const SECRET_PATTERN = new RegExp("pl" + "k_[A-Za-z0-9_-]+");

export async function parseOpenApiSource(text, contentType = "") {
  if (typeof text !== "string") throw new TypeError("OpenAPI source must be text");
  const trimmed = text.trimStart();
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();

  let document;
  if (mediaType.includes("html") || trimmed.startsWith("<")) {
    document = parseEmbeddedHtml(text);
  } else if (mediaType.includes("json") || trimmed.startsWith("{")) {
    document = parseJson(text, "invalid OpenAPI JSON");
  } else {
    document = await parseYaml(text);
  }

  validateOpenApi(document);
  const canonical = canonicalize(document);
  if (SECRET_PATTERN.test(JSON.stringify(canonical))) {
    throw new Error("OpenAPI source contains a secret-looking value");
  }
  return canonical;
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

export function canonicalJson(document) {
  return `${JSON.stringify(canonicalize(document), null, 2)}\n`;
}

export function operationInventory(document) {
  const operations = [];
  for (const path of Object.keys(document.paths).sort()) {
    const pathItem = document.paths[path];
    if (!isObject(pathItem)) continue;
    for (const method of Object.keys(pathItem).filter((key) => HTTP_METHODS.has(key.toLowerCase())).sort()) {
      operations.push({
        method: method.toUpperCase(),
        path,
        operationId: pathItem[method]?.operationId,
      });
    }
  }
  return operations;
}

export async function writeOpenApiYaml(document) {
  return withTemporaryDirectory(async (directory) => {
    const input = join(directory, "canonical.json");
    await writeFile(input, canonicalJson(document), "utf8");
    const { stdout } = await execFileAsync(
      "ruby",
      [fileURLToPath(new URL("scripts/write-openapi-yaml.rb", repositoryRoot)), input],
      { encoding: "utf8" },
    );
    return stdout;
  });
}

function parseEmbeddedHtml(html) {
  const assignment = /\b(?:const|let|var)\s+openApiSpec\s*=\s*/g.exec(html);
  if (!assignment) throw new Error("openApiSpec assignment not found in HTML");
  const start = html.indexOf("{", assignment.index + assignment[0].length);
  if (start < 0) throw new Error("openApiSpec assignment has no object");
  const end = findBalancedObjectEnd(html, start);
  if (end < 0) throw new Error("unterminated openApiSpec assignment");
  return parseJson(html.slice(start, end + 1), "invalid openApiSpec JSON");
}

function findBalancedObjectEnd(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseJson(source, message) {
  try {
    return JSON.parse(source);
  } catch {
    throw new Error(message);
  }
}

async function parseYaml(source) {
  return withTemporaryDirectory(async (directory) => {
    const input = join(directory, "source.yaml");
    await writeFile(input, source, "utf8");
    try {
      const { stdout } = await execFileAsync(
        "ruby",
        [fileURLToPath(new URL("scripts/parse-openapi-yaml.rb", repositoryRoot)), input],
        { encoding: "utf8" },
      );
      return JSON.parse(stdout);
    } catch (error) {
      const detail = typeof error?.stderr === "string" ? error.stderr.trim() : "YAML parse failed";
      throw new Error(detail || "YAML parse failed");
    }
  });
}

function validateOpenApi(document) {
  if (!isObject(document) || typeof document.openapi !== "string" || !document.openapi.startsWith("3.")) {
    throw new Error("source must contain an OpenAPI 3 version");
  }
  if (!isObject(document.paths)) throw new Error("OpenAPI paths must be an object");

  const methodPaths = new Set();
  const operationIds = new Set();
  for (const operation of operationInventory(document)) {
    const methodPath = `${operation.method} ${operation.path}`;
    if (methodPaths.has(methodPath)) throw new Error(`duplicate method/path: ${methodPath}`);
    methodPaths.add(methodPath);
    if (typeof operation.operationId === "string" && operation.operationId) {
      if (operationIds.has(operation.operationId)) {
        throw new Error(`duplicate operationId: ${operation.operationId}`);
      }
      operationIds.add(operation.operationId);
    }
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(join(tmpdir(), "plaky115-openapi-source-"));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
