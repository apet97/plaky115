import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export const REQUEST_KINDS = Object.freeze(["none", "json", "multipart"]);
export const SUCCESS_KINDS = Object.freeze(["json-object", "json-array", "void"]);
export const COMPACT_KINDS = Object.freeze([
  "raw",
  "space",
  "board",
  "item",
  "comment",
  "itemGroup",
  "itemFile",
  "downloadLink",
]);
export const CONFIRMATION_VALUES = Object.freeze(["none", "destructive"]);

const REQUIRED_OPERATION_KEYS = [
  "operationId",
  "method",
  "path",
  "request",
  "success",
  "mcpName",
  "mcpTitle",
  "scopes",
  "readOnly",
  "destructive",
  "idempotent",
  "openWorld",
  "confirmation",
  "compactKind",
  "sensitiveOutput",
  "list",
  "mutation",
  "bodyRequired",
];
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];
const PARAMETER_LOCATIONS = ["path", "query"];
const PARAMETER_TYPES = ["string", "integer", "number", "boolean", "array"];
const PART_TYPES = ["string", "integer", "number", "boolean"];

export function loadOperationMetadata(root, relativePath = "openapi/plaky115-operation-metadata.json") {
  const configuredPath = process.env.PLAKY115_METADATA_PATH || relativePath;
  const path = isAbsolute(configuredPath) ? configuredPath : join(root, configuredPath);
  return validateOperationMetadata(JSON.parse(readFileSync(path, "utf8")));
}

export function validateOperationMetadata(metadata) {
  requireObject(metadata, "metadata");
  if (!Array.isArray(metadata.operations)) throw new Error("metadata at operations: must be an array");

  const operationIds = new Set();
  const mcpNames = new Set();
  const operations = metadata.operations.map((rawOperation, index) => {
    requireObject(rawOperation, `operations[${index}]`);
    const provisionalId = typeof rawOperation.operationId === "string"
      ? rawOperation.operationId
      : `operations[${index}]`;
    for (const key of REQUIRED_OPERATION_KEYS) {
      if (!(key in rawOperation)) fail(provisionalId, key, "is required");
    }

    const operation = structuredClone(rawOperation);
    const id = operation.operationId;
    requireString(id, id, "operationId");
    requireOneOf(operation.method, HTTP_METHODS, id, "method");
    requireString(operation.path, id, "path");
    requireString(operation.mcpName, id, "mcpName");
    requireString(operation.mcpTitle, id, "mcpTitle");
    if (!Array.isArray(operation.scopes) || operation.scopes.some((scope) => typeof scope !== "string")) {
      fail(id, "scopes", "must be an array of strings");
    }
    for (const key of [
      "readOnly", "destructive", "idempotent", "openWorld", "sensitiveOutput",
      "list", "mutation", "bodyRequired",
    ]) {
      if (typeof operation[key] !== "boolean") fail(id, key, "must be a boolean");
    }
    requireOneOf(operation.confirmation, CONFIRMATION_VALUES, id, "confirmation");
    requireOneOf(operation.compactKind, COMPACT_KINDS, id, "compactKind");
    validateRequest(operation.request, id);
    validateSuccess(operation.success, id);

    operation.parameters = normalizeArray(operation.parameters, id, "parameters");
    operation.parameters.forEach((parameter, parameterIndex) => {
      validateParameter(parameter, id, `parameters[${parameterIndex}]`);
    });
    operation.query = normalizeArray(operation.query, id, "query");
    operation.pagination = normalizePagination(operation.pagination, id);

    if (operationIds.has(id)) throw new Error(`duplicate operationId: ${id}`);
    if (mcpNames.has(operation.mcpName)) throw new Error(`duplicate mcpName: ${operation.mcpName}`);
    operationIds.add(id);
    mcpNames.add(operation.mcpName);
    return operation;
  });

  return { ...structuredClone(metadata), operations };
}

function validateRequest(request, id) {
  requireObject(request, `operation ${id} at request`);
  requireOneOf(request.kind, REQUEST_KINDS, id, "request.kind");
  if (typeof request.required !== "boolean") fail(id, "request.required", "must be a boolean");
  if (request.kind !== "none") requireString(request.mediaType, id, "request.mediaType");
  if (request.kind === "multipart") {
    request.parts = normalizeArray(request.parts, id, "request.parts");
    request.parts.forEach((part, index) => {
      const path = `request.parts[${index}]`;
      requireObject(part, `operation ${id} at ${path}`);
      requireString(part.name, id, `${path}.name`);
      if (typeof part.required !== "boolean") fail(id, `${path}.required`, "must be a boolean");
      requireOneOf(part.type, PART_TYPES, id, `${path}.type`);
    });
  }
}

function validateSuccess(success, id) {
  requireObject(success, `operation ${id} at success`);
  if (!Number.isInteger(success.status) || success.status < 200 || success.status > 299) {
    fail(id, "success.status", "must be a successful HTTP status");
  }
  requireOneOf(success.kind, SUCCESS_KINDS, id, "success.kind");
  if (success.kind !== "void") requireString(success.mediaType, id, "success.mediaType");
}

function validateParameter(parameter, id, path) {
  requireObject(parameter, `operation ${id} at ${path}`);
  requireString(parameter.name, id, `${path}.name`);
  requireOneOf(parameter.in, PARAMETER_LOCATIONS, id, `${path}.in`);
  if (typeof parameter.required !== "boolean") fail(id, `${path}.required`, "must be a boolean");
  if (parameter.in === "path" && parameter.required !== true) fail(id, `${path}.required`, "path parameters must be required");
  validateParameterSchema(parameter.schema, id, `${path}.schema`);
}

function validateParameterSchema(schema, id, path) {
  requireObject(schema, `operation ${id} at ${path}`);
  if (!PARAMETER_TYPES.includes(schema.type)) fail(id, `${path}.type`, `unsupported value ${schema.type}`);
  if (schema.type === "array") {
    requireObject(schema.items, `operation ${id} at ${path}.items`);
    if (!PART_TYPES.includes(schema.items.type)) {
      fail(id, `${path}.items.type`, `unsupported value ${schema.items.type}`);
    }
  }
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length === 0)) {
    fail(id, `${path}.enum`, "must be a non-empty array");
  }
}

function normalizePagination(pagination, id) {
  if (pagination == null) return null;
  requireObject(pagination, `operation ${id} at pagination`);
  const normalized = structuredClone(pagination);
  normalized.inputs = normalizeArray(normalized.inputs, id, "pagination.inputs");
  normalized.inputs.forEach((parameter, index) => {
    validateParameter(parameter, id, `pagination.inputs[${index}]`);
  });
  return normalized;
}

function normalizeArray(value, id, path) {
  if (value == null) return [];
  if (!Array.isArray(value)) fail(id, path, "must be an array");
  return structuredClone(value);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: must be an object`);
  }
}

function requireString(value, id, path) {
  if (typeof value !== "string" || value.length === 0) fail(id, path, "must be a non-empty string");
}

function requireOneOf(value, allowed, id, path) {
  if (!allowed.includes(value)) fail(id, path, `unsupported value ${value}`);
}

function fail(id, path, message) {
  throw new Error(`operation ${id} at ${path}: ${message}`);
}
