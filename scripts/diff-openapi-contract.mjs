#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { canonicalize, parseOpenApiSource } from "./lib/openapi-source-parser.mjs";

const DOCUMENTATION_KEYS = new Set(["description", "summary", "externalDocs", "example", "examples"]);
const METHODS = new Set(["get", "put", "post", "delete", "patch", "options", "head", "trace"]);

export function diffOpenApiContracts(before, after) {
  const beforeCanonical = JSON.stringify(canonicalize(before));
  const afterCanonical = JSON.stringify(canonicalize(after));
  if (beforeCanonical === afterCanonical) return { classification: "none", changes: [] };

  const changes = [];
  compareOperations(before, after, changes);
  compareSchemaSets(before, after, changes);

  const semanticBefore = JSON.stringify(canonicalize(stripDocumentation(before)));
  const semanticAfter = JSON.stringify(canonicalize(stripDocumentation(after)));
  if (changes.length === 0 && semanticBefore !== semanticAfter) {
    changes.push({ kind: "contract-change", severity: "breaking" });
  }
  changes.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));

  let classification = "documentation";
  if (changes.some(({ severity }) => severity === "breaking")) classification = "breaking";
  else if (changes.some(({ severity }) => severity === "transport")) classification = "transport";
  else if (changes.some(({ severity }) => severity === "additive")) classification = "additive";
  else if (semanticBefore === semanticAfter) classification = "documentation";

  return { classification, changes };
}

export function renderSemanticDiffMarkdown(diff) {
  const lines = ["# OpenAPI semantic diff", "", `Classification: **${diff.classification}**`, ""];
  if (diff.changes.length === 0) {
    lines.push("No semantic changes.");
  } else {
    lines.push("## Changes", "");
    for (const change of diff.changes) {
      lines.push(`- \`${change.kind}\` (${change.severity}): ${changeSummary(change)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function compareOperations(before, after, changes) {
  const oldOperations = operationsById(before);
  const newOperations = operationsById(after);
  for (const id of [...new Set([...oldOperations.keys(), ...newOperations.keys()])].sort()) {
    const oldOperation = oldOperations.get(id);
    const newOperation = newOperations.get(id);
    if (!oldOperation) {
      changes.push({ kind: "operation-added", severity: "additive", operationId: id, to: location(newOperation) });
      continue;
    }
    if (!newOperation) {
      changes.push({ kind: "operation-removed", severity: "breaking", operationId: id, from: location(oldOperation) });
      continue;
    }
    if (oldOperation.method !== newOperation.method || oldOperation.path !== newOperation.path) {
      changes.push({
        kind: "operation-location",
        severity: "breaking",
        operationId: id,
        from: location(oldOperation),
        to: location(newOperation),
      });
    }
    if (!arraysEqual(oldOperation.requestMediaTypes, newOperation.requestMediaTypes)) {
      changes.push({
        kind: "request-media-type",
        severity: "transport",
        operationId: id,
        from: oldOperation.requestMediaTypes,
        to: newOperation.requestMediaTypes,
      });
    }
    if (oldOperation.responseKind !== newOperation.responseKind) {
      changes.push({
        kind: "response-kind",
        severity: "transport",
        operationId: id,
        from: oldOperation.responseKind,
        to: newOperation.responseKind,
      });
    }
  }
}

function operationsById(document) {
  const result = new Map();
  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    if (!isObject(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(method.toLowerCase()) || !isObject(operation)) continue;
      const operationId = typeof operation.operationId === "string" && operation.operationId
        ? operation.operationId
        : `${method.toUpperCase()} ${path}`;
      result.set(operationId, {
        method: method.toUpperCase(),
        path,
        requestMediaTypes: Object.keys(operation.requestBody?.content ?? {}).sort(),
        responseKind: primaryResponseKind(operation.responses ?? {}),
      });
    }
  }
  return result;
}

function primaryResponseKind(responses) {
  const success = Object.keys(responses)
    .filter((status) => /^2\d\d$/.test(status))
    .sort((left, right) => Number(left) - Number(right))[0];
  if (!success) return "none";
  const content = responses[success]?.content;
  if (!isObject(content) || Object.keys(content).length === 0) return "void";
  if (content["application/json"]) {
    return content["application/json"].schema?.type === "array" ? "json-array" : "json-object";
  }
  return `media:${Object.keys(content).sort().join(",")}`;
}

function compareSchemaSets(before, after, changes) {
  const oldRequired = collectArrays(before, "required");
  const newRequired = collectArrays(after, "required");
  compareArrayMaps(oldRequired, newRequired, (pointer, from, to) => ({
    kind: "required-properties",
    severity: "breaking",
    pointer,
    from,
    to,
  }), changes);

  const oldEnums = collectArrays(before, "enum");
  const newEnums = collectArrays(after, "enum");
  compareArrayMaps(oldEnums, newEnums, (pointer, from, to) => {
    const fromSet = new Set(from.map(JSON.stringify));
    const toSet = new Set(to.map(JSON.stringify));
    const widened = [...fromSet].every((value) => toSet.has(value));
    return {
      kind: widened ? "enum-widened" : "enum-narrowed",
      severity: widened ? "additive" : "breaking",
      pointer,
      from,
      to,
    };
  }, changes);
}

function collectArrays(document, keyToCollect) {
  const result = new Map();
  walk(document, "#", (value, pointer, key) => {
    if (key === keyToCollect && Array.isArray(value)) {
      result.set(pointer, [...value].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))));
    }
  });
  return result;
}

function compareArrayMaps(before, after, makeChange, changes) {
  for (const pointer of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const from = before.get(pointer) ?? [];
    const to = after.get(pointer) ?? [];
    if (!arraysEqual(from, to)) changes.push(makeChange(pointer, from, to));
  }
}

function walk(value, pointer, visit, key = "") {
  visit(value, pointer, key);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, `${pointer}/${index}`, visit, String(index)));
  } else if (isObject(value)) {
    for (const childKey of Object.keys(value).sort()) {
      walk(value[childKey], `${pointer}/${escapePointer(childKey)}`, visit, childKey);
    }
  }
}

function stripDocumentation(value) {
  if (Array.isArray(value)) return value.map(stripDocumentation);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !DOCUMENTATION_KEYS.has(key))
      .map(([key, child]) => [key, stripDocumentation(child)]),
  );
}

function changeSummary(change) {
  return change.operationId ?? change.pointer ?? "contract structure changed";
}

function location(operation) {
  return `${operation.method} ${operation.path}`;
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function escapePointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readSpec(path) {
  const source = await readFile(path, "utf8");
  const extension = extname(path).toLowerCase();
  const contentType = extension === ".json" ? "application/json" : "application/yaml";
  return parseOpenApiSource(source, contentType);
}

function printHelp() {
  process.stdout.write("Usage: diff-openapi-contract.mjs [--before PATH] [--after PATH] [--json-output PATH] [--markdown-output PATH]\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      before: { type: "string", default: "api-1.yaml" },
      after: { type: "string", default: ".contract-candidate/current/candidate.yaml" },
      "json-output": { type: "string", default: ".contract-candidate/current/diff.json" },
      "markdown-output": { type: "string", default: ".contract-candidate/current/diff.md" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return printHelp();
  const diff = diffOpenApiContracts(await readSpec(values.before), await readSpec(values.after));
  const json = `${JSON.stringify(diff, null, 2)}\n`;
  await writeFile(values["json-output"], json);
  await writeFile(values["markdown-output"], renderSemanticDiffMarkdown(diff));
  process.stdout.write(json);
  if (diff.classification !== "none") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
