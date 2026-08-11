import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

export const REQUEST_KINDS = Object.freeze(["none", "json", "multipart"]);
export const SUCCESS_KINDS = Object.freeze(["json-object", "json-array", "paged-object", "void"]);
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
];
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];
const PARAMETER_LOCATIONS = ["path", "query"];
const PARAMETER_TYPES = ["string", "integer", "number", "boolean", "array"];
const PART_TYPES = ["string", "integer", "number", "boolean"];
const ROOT_KINDS = ["object", "array", "string", "integer", "number", "boolean"];

export function loadOperationMetadata(root, relativePath = "openapi/plaky115-operation-metadata.json") {
  const path = isAbsolute(relativePath) ? relativePath : join(root, relativePath);
  return validateOperationMetadata(JSON.parse(readFileSync(path, "utf8")));
}

export function validateOperationMetadata(metadata) {
  requireObject(metadata, "metadata");
  if (metadata.descriptorVersion !== 2) {
    throw new Error(`metadata at descriptorVersion: unsupported value ${metadata.descriptorVersion}`);
  }
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
      "list", "mutation",
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
    operation.pagination = normalizePagination(operation.pagination, id, operation.parameters);

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
  if (request.kind !== "none") {
    requireString(request.mediaType, id, "request.mediaType");
    requireOneOf(request.rootKind, ROOT_KINDS, id, "request.rootKind");
    if (!Array.isArray(request.requiredProperties) || request.requiredProperties.some((property) => typeof property !== "string")) {
      fail(id, "request.requiredProperties", "must be an array of strings");
    }
    if (request.requiredProperties.some((property, index, properties) => properties.indexOf(property) !== index)) {
      fail(id, "request.requiredProperties", "must not contain duplicates");
    }
    if (request.rootKind === "object") {
      if (typeof request.allowEmptyObject !== "boolean") fail(id, "request.allowEmptyObject", "must be a boolean");
      if (request.allowEmptyObject && request.requiredProperties.length > 0) {
        fail(id, "request.allowEmptyObject", "cannot be true when requiredProperties is non-empty");
      }
    } else if (request.allowEmptyObject !== undefined) {
      fail(id, "request.allowEmptyObject", "is only valid for object roots");
    }
  }
  if (request.schemaRef !== undefined) requireString(request.schemaRef, id, "request.schemaRef");
  if (request.filenamePolicy !== undefined) validateFilenamePolicy(request.filenamePolicy, id, "request.filenamePolicy");
  if (request.kind === "multipart") {
    request.parts = normalizeArray(request.parts, id, "request.parts");
    request.parts.forEach((part, index) => {
      const path = `request.parts[${index}]`;
      requireObject(part, `operation ${id} at ${path}`);
      requireString(part.name, id, `${path}.name`);
      if (typeof part.required !== "boolean") fail(id, `${path}.required`, "must be a boolean");
      requireOneOf(part.type, PART_TYPES, id, `${path}.type`);
      if (part.format !== undefined) requireString(part.format, id, `${path}.format`);
    });
  }
}

function validateSuccess(success, id) {
  requireObject(success, `operation ${id} at success`);
  if (!Number.isInteger(success.status) || success.status < 200 || success.status > 299) {
    fail(id, "success.status", "must be a successful HTTP status");
  }
  requireOneOf(success.kind, SUCCESS_KINDS, id, "success.kind");
  if (success.kind !== "void") {
    requireString(success.mediaType, id, "success.mediaType");
    requireOneOf(success.rootKind, ROOT_KINDS, id, "success.rootKind");
    if (success.kind === "json-array" && success.rootKind !== "array") fail(id, "success.rootKind", "must be array for json-array");
    if (["json-object", "paged-object"].includes(success.kind) && success.rootKind !== "object") {
      fail(id, "success.rootKind", `must be object for ${success.kind}`);
    }
    if (success.rootKind === "object") {
      if (!Array.isArray(success.requiredProperties) || success.requiredProperties.some((property) => typeof property !== "string")) {
        fail(id, "success.requiredProperties", "must be an array of strings");
      }
      if (success.requiredProperties.some((property, index, properties) => properties.indexOf(property) !== index)) {
        fail(id, "success.requiredProperties", "must not contain duplicates");
      }
    }
    if (success.kind === "paged-object") {
      if (!success.requiredProperties.includes("data") || !success.requiredProperties.includes("hasMore")) {
        fail(id, "success.requiredProperties", "paged-object requires data and hasMore");
      }
    }
    if (success.createdIdPointer !== undefined) requireString(success.createdIdPointer, id, "success.createdIdPointer");
    if (success.sensitiveLink !== undefined && typeof success.sensitiveLink !== "boolean") {
      fail(id, "success.sensitiveLink", "must be a boolean");
    }
  }
}

function validateParameter(parameter, id, path) {
  requireObject(parameter, `operation ${id} at ${path}`);
  requireString(parameter.name, id, `${path}.name`);
  requireOneOf(parameter.in, PARAMETER_LOCATIONS, id, `${path}.in`);
  if (typeof parameter.required !== "boolean") fail(id, `${path}.required`, "must be a boolean");
  if (parameter.in === "path" && parameter.required !== true) fail(id, `${path}.required`, "path parameters must be required");
  if (parameter.style !== undefined) requireString(parameter.style, id, `${path}.style`);
  if (parameter.explode !== undefined && typeof parameter.explode !== "boolean") fail(id, `${path}.explode`, "must be a boolean");
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
    validateParameterSchema(schema.items, id, `${path}.items`);
  }
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || schema.enum.length === 0)) {
    fail(id, `${path}.enum`, "must be a non-empty array");
  }
  if (schema.format !== undefined) requireString(schema.format, id, `${path}.format`);
  if (schema.pattern !== undefined) requireString(schema.pattern, id, `${path}.pattern`);
  for (const key of ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"]) {
    if (schema[key] !== undefined && (typeof schema[key] !== "number" || !Number.isFinite(schema[key]))) {
      fail(id, `${path}.${key}`, "must be a finite number");
    }
  }
  for (const key of ["minLength", "maxLength", "minItems", "maxItems"]) {
    if (schema[key] !== undefined && (!Number.isInteger(schema[key]) || schema[key] < 0)) {
      fail(id, `${path}.${key}`, "must be a non-negative integer");
    }
  }
  if (schema.uniqueItems !== undefined && typeof schema.uniqueItems !== "boolean") {
    fail(id, `${path}.uniqueItems`, "must be a boolean");
  }
  if (schema.multipleOf !== undefined && schema.multipleOf <= 0) {
    fail(id, `${path}.multipleOf`, "must be greater than zero");
  }
  if (schema.minimum !== undefined && schema.maximum !== undefined && schema.minimum > schema.maximum) {
    fail(id, `${path}`, "minimum cannot exceed maximum");
  }
  if (schema.minLength !== undefined && schema.maxLength !== undefined && schema.minLength > schema.maxLength) {
    fail(id, `${path}`, "minLength cannot exceed maxLength");
  }
  if (schema.minItems !== undefined && schema.maxItems !== undefined && schema.minItems > schema.maxItems) {
    fail(id, `${path}`, "minItems cannot exceed maxItems");
  }
}

function normalizePagination(pagination, id, parameters) {
  if (pagination == null) return null;
  requireObject(pagination, `operation ${id} at pagination`);
  const normalized = structuredClone(pagination);
  requireOneOf(normalized.kind, ["pageNumber"], id, "pagination.kind");
  for (const key of ["pageParameter", "sizeParameter", "resultsPointer", "hasMorePointer"]) {
    requireString(normalized[key], id, `pagination.${key}`);
  }
  if (normalized.pageParameter === normalized.sizeParameter) fail(id, "pagination", "page and size parameters must differ");
  normalized.inputs = normalizeArray(normalized.inputs, id, "pagination.inputs");
  if (normalized.inputs.length !== 2) fail(id, "pagination.inputs", "must contain page and size parameters");
  normalized.inputs.forEach((parameter, index) => {
    validateParameter(parameter, id, `pagination.inputs[${index}]`);
    if (parameter.in !== "query") fail(id, `pagination.inputs[${index}].in`, "pagination inputs must be query parameters");
  });
  const inputNames = normalized.inputs.map((parameter) => parameter.name);
  if (inputNames[0] !== normalized.pageParameter || inputNames[1] !== normalized.sizeParameter) {
    fail(id, "pagination.inputs", "must match pageParameter and sizeParameter in order");
  }
  if (new Set(inputNames).size !== inputNames.length) fail(id, "pagination.inputs", "must contain unique parameter names");
  for (const inputName of inputNames) {
    if (parameters.some((parameter) => parameter.in === "query" && parameter.name === inputName)) {
      fail(id, "pagination.inputs", `duplicates generic query parameter ${inputName}`);
    }
  }
  return normalized;
}

function validateFilenamePolicy(policy, id, path) {
  requireObject(policy, `operation ${id} at ${path}`);
  if (!Number.isInteger(policy.maxUtf8Bytes) || policy.maxUtf8Bytes < 1) {
    fail(id, `${path}.maxUtf8Bytes`, "must be a positive integer");
  }
  requireString(policy.evidence, id, `${path}.evidence`);
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
