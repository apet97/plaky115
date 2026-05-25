import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadMetadata(root) {
  return JSON.parse(readFileSync(join(root, "openapi/plaky115-operation-metadata.json"), "utf8"));
}

export function slug(operationId) {
  return operationId.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function pathParams(path) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}
