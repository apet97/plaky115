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

export function describeOperation(operation) {
  if (!operation?.operationId || !operation?.method || !operation?.path) throw new Error("operation metadata is incomplete");
  const parameters = operation.parameters ?? [];
  const pathParameters = parameters.filter((parameter) => parameter.in === "path");
  const queryParameters = mergeParameters([
    ...parameters.filter((parameter) => parameter.in === "query"),
    ...(operation.pagination?.inputs ?? []),
  ], operation.operationId);
  const placeholders = pathParams(operation.path);
  const pathParameterNames = pathParameters.map((parameter) => parameter.name);
  if (new Set(placeholders).size !== placeholders.length
    || placeholders.length !== pathParameterNames.length
    || placeholders.some((name) => !pathParameterNames.includes(name))) {
    throw new Error(`${operation.operationId}: path placeholders and parameters disagree`);
  }
  if (operation.request?.kind === "multipart") validateMultipart(operation);
  return Object.freeze({
    pathParameters: Object.freeze([...pathParameters]),
    queryParameters: Object.freeze(queryParameters),
    pagination: operation.pagination ?? null,
    requestKind: operation.request?.kind,
    requestRootKind: operation.request?.rootKind,
    requestRequiredProperties: Object.freeze([...(operation.request?.requiredProperties ?? [])]),
    allowEmptyObject: operation.request?.allowEmptyObject,
    mutation: operation.mutation === true,
    isVoid: operation.success?.kind === "void",
    isArray: operation.success?.kind === "json-array",
    isPaged: operation.success?.kind === "paged-object",
    successRootKind: operation.success?.rootKind,
    successRequiredProperties: Object.freeze([...(operation.success?.requiredProperties ?? [])]),
    createdIdPointer: operation.success?.createdIdPointer,
    sensitiveLink: operation.success?.sensitiveLink === true,
    acceptsIdempotencyKey: operation.mutation === true && operation.request?.kind !== "none",
  });
}

function mergeParameters(parameters, operationId) {
  const merged = [];
  const seen = new Map();
  for (const parameter of parameters) {
    const identity = `${parameter.in}:${parameter.name}`;
    const prior = seen.get(identity);
    if (!prior) {
      seen.set(identity, parameter);
      merged.push(parameter);
      continue;
    }
    for (const key of ["in", "required", "style", "explode"]) {
      if (prior[key] !== parameter[key]) throw new Error(`${operationId}: contradictory parameter ${parameter.name}`);
    }
    if (JSON.stringify(prior.schema) !== JSON.stringify(parameter.schema)) {
      throw new Error(`${operationId}: contradictory parameter schema ${parameter.name}`);
    }
  }
  return Object.freeze(merged);
}

function validateMultipart(operation) {
  const parts = operation.request.parts;
  const valid = parts?.length === 1 && parts[0].name === "file" && parts[0].required === true
    && parts[0].type === "string" && parts[0].format === "binary";
  if (!valid) throw new Error(`${operation.operationId}: expected a single required binary multipart part named file`);
}
