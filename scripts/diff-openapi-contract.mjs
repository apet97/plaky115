#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { canonicalize, parseOpenApiSource } from "./lib/openapi-source-parser.mjs";

const DOCUMENTATION_KEYS = new Set([
  "contact",
  "description",
  "example",
  "examples",
  "externalDocs",
  "license",
  "summary",
  "tags",
  "termsOfService",
  "title",
  "version",
]);
const METHODS = new Set(["get", "put", "post", "delete", "patch", "options", "head", "trace"]);
const BOUND_KEYS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "multipleOf",
];
const SCHEMA_KEYS = new Set([
  "$ref",
  "additionalProperties",
  "allOf",
  "anyOf",
  "const",
  "default",
  "deprecated",
  "discriminator",
  "enum",
  "exclusiveMaximum",
  "exclusiveMinimum",
  "format",
  "items",
  "maxItems",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "multipleOf",
  "nullable",
  "oneOf",
  "pattern",
  "properties",
  "readOnly",
  "required",
  "type",
  "uniqueItems",
  "writeOnly",
]);
const SEVERITY_ORDER = ["breaking", "review-required", "transport", "additive"];

export function diffOpenApiContracts(before, after) {
  const beforeCanonical = canonicalize(before);
  const afterCanonical = canonicalize(after);
  if (JSON.stringify(beforeCanonical) === JSON.stringify(afterCanonical)) {
    return { classification: "none", changes: [] };
  }

  const beforeSemantic = stripDocumentation(normalizeSemanticArrays(beforeCanonical));
  const afterSemantic = stripDocumentation(normalizeSemanticArrays(afterCanonical));
  if (JSON.stringify(beforeSemantic) === JSON.stringify(afterSemantic)) {
    return { classification: "documentation", changes: [] };
  }

  const changes = [];
  const knownPointers = new Set();
  const rootSchemaPointers = new Set([
    ...payloadRootPointers(beforeCanonical),
    ...payloadRootPointers(afterCanonical),
  ]);

  compareOperations(beforeCanonical, afterCanonical, changes, knownPointers);
  compareDocumentField(beforeCanonical, afterCanonical, "security", "security", "breaking", changes, knownPointers);
  compareDocumentField(beforeCanonical, afterCanonical, "servers", "servers", "review-required", changes, knownPointers);
  compareSchemaSets(beforeCanonical, afterCanonical, rootSchemaPointers, changes, knownPointers);
  compareUnknownSemanticChanges(beforeSemantic, afterSemantic, changes, knownPointers);

  const uniqueChanges = deduplicateChanges(changes);
  uniqueChanges.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    classification: classifyChanges(uniqueChanges),
    changes: uniqueChanges,
  };
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

function compareOperations(before, after, changes, knownPointers) {
  const oldOperations = operationsById(before);
  const newOperations = operationsById(after);
  for (const operationId of [...new Set([...oldOperations.keys(), ...newOperations.keys()])].sort()) {
    const oldOperation = oldOperations.get(operationId);
    const newOperation = newOperations.get(operationId);
    if (!oldOperation) {
      markSubtree(knownPointers, newOperation.pointer);
      addChange(changes, {
        kind: "operation-added",
        severity: "additive",
        operationId,
        pointer: newOperation.pointer,
        to: location(newOperation),
        producer: "additive",
        consumer: "compatible",
      });
      continue;
    }
    if (!newOperation) {
      markSubtree(knownPointers, oldOperation.pointer);
      addChange(changes, {
        kind: "operation-removed",
        severity: "breaking",
        operationId,
        pointer: oldOperation.pointer,
        from: location(oldOperation),
        producer: "breaking",
        consumer: "breaking",
      });
      continue;
    }
    if (oldOperation.method !== newOperation.method || oldOperation.path !== newOperation.path) {
      markSubtree(knownPointers, oldOperation.pointer);
      markSubtree(knownPointers, newOperation.pointer);
      addChange(changes, {
        kind: "operation-location",
        severity: "breaking",
        operationId,
        pointer: newOperation.pointer,
        from: location(oldOperation),
        to: location(newOperation),
      });
      continue;
    }

    compareParameters(oldOperation, newOperation, changes, knownPointers);
    compareRequest(oldOperation, newOperation, changes, knownPointers);
    compareResponses(oldOperation, newOperation, changes, knownPointers);
    compareOperationField(oldOperation, newOperation, "security", "security", "breaking", changes, knownPointers);
    compareOperationField(oldOperation, newOperation, "servers", "servers", "review-required", changes, knownPointers);
  }
}

function compareParameters(oldOperation, newOperation, changes, knownPointers) {
  const oldParameters = parameterEntries(oldOperation);
  const newParameters = parameterEntries(newOperation);
  const oldByIdentity = new Map(oldParameters.map((entry) => [entry.identity, entry]));
  const newByIdentity = new Map(newParameters.map((entry) => [entry.identity, entry]));
  const oldByName = new Map(oldParameters.map((entry) => [entry.value.name, entry]));
  const newByName = new Map(newParameters.map((entry) => [entry.value.name, entry]));

  for (const name of [...new Set([...oldByName.keys(), ...newByName.keys()])].sort()) {
    const oldParameter = oldByName.get(name);
    const newParameter = newByName.get(name);
    if (oldParameter && newParameter && oldParameter.value.in !== newParameter.value.in) {
      markParameterKnown(knownPointers, oldParameter, newParameter);
      addChange(changes, {
        kind: "parameter-location",
        severity: "breaking",
        operationId: newOperation.operationId,
        pointer: newParameter.pointer,
        from: oldParameter.value.in,
        to: newParameter.value.in,
      });
    }
  }

  for (const identity of [...new Set([...oldByIdentity.keys(), ...newByIdentity.keys()])].sort()) {
    const oldParameter = oldByIdentity.get(identity);
    const newParameter = newByIdentity.get(identity);
    if (!oldParameter) {
      markSubtree(knownPointers, newParameter.pointer);
      addChange(changes, {
        kind: "parameter-added",
        severity: newParameter.value.required === true ? "breaking" : "additive",
        operationId: newOperation.operationId,
        pointer: newParameter.pointer,
        to: parameterSummary(newParameter.value),
        producer: newParameter.value.required === true ? "breaking" : "additive",
        consumer: newParameter.value.required === true ? "breaking" : "compatible",
      });
      addParameterAdditionDetails(newParameter, changes);
      continue;
    }
    if (!newParameter) {
      markSubtree(knownPointers, oldParameter.pointer);
      addChange(changes, {
        kind: "parameter-removed",
        severity: "breaking",
        operationId: oldOperation.operationId,
        pointer: oldParameter.pointer,
        from: parameterSummary(oldParameter.value),
        producer: "breaking",
        consumer: "breaking",
      });
      continue;
    }

    compareParameterField(oldParameter, newParameter, "required", "parameter-required", "breaking", changes, knownPointers);
    compareParameterField(oldParameter, newParameter, "style", "parameter-style", "transport", changes, knownPointers);
    compareParameterField(oldParameter, newParameter, "explode", "parameter-explode", "transport", changes, knownPointers);
    compareParameterSchema(oldParameter, newParameter, changes, knownPointers);
  }
}

function compareParameterField(oldParameter, newParameter, field, kind, changedSeverity, changes, knownPointers) {
  const pointer = `${newParameter.pointer}/${escapePointer(field)}`;
  mark(knownPointers, pointer);
  const from = oldParameter.value[field] ?? null;
  const to = newParameter.value[field] ?? null;
  if (JSON.stringify(from) === JSON.stringify(to)) return;
  const severity = field === "required"
    ? (to === true ? "breaking" : "additive")
    : changedSeverity;
  addChange(changes, {
    kind,
    severity,
    operationId: newParameter.operationId,
    pointer,
    from,
    to,
    producer: severity,
    consumer: field === "required" && to === false ? "compatible" : severity,
  });
}

function addParameterAdditionDetails(parameter, changes) {
  for (const [field, kind, severity] of [
    ["required", "parameter-required", parameter.value.required === true ? "breaking" : "additive"],
    ["style", "parameter-style", "transport"],
    ["explode", "parameter-explode", "transport"],
  ]) {
    if (parameter.value[field] === undefined) continue;
    addChange(changes, {
      kind,
      severity,
      operationId: parameter.operationId,
      pointer: `${parameter.pointer}/${field}`,
      from: null,
      to: parameter.value[field],
      producer: severity,
      consumer: field === "required" && parameter.value[field] === false ? "compatible" : severity,
    });
  }
  if (parameter.value.schema !== undefined) {
    addChange(changes, {
      kind: "parameter-schema",
      severity: "transport",
      operationId: parameter.operationId,
      pointer: `${parameter.pointer}/schema`,
      from: null,
      to: schemaConstraintSummary(parameter.value.schema),
    });
  }
}

function compareParameterSchema(oldParameter, newParameter, changes, knownPointers) {
  const oldSchema = oldParameter.value.schema;
  const newSchema = newParameter.value.schema;
  const pointer = `${newParameter.pointer}/schema`;
  markSchemaFields(knownPointers, oldParameter.pointer, newParameter.pointer);
  const from = schemaConstraintSummary(oldSchema);
  const to = schemaConstraintSummary(newSchema);
  if (JSON.stringify(from) === JSON.stringify(to)) return;
  addChange(changes, {
    kind: "parameter-schema",
    severity: schemaConstraintSeverity(from, to),
    operationId: newParameter.operationId,
    pointer,
    from,
    to,
  });
}

function compareRequest(oldOperation, newOperation, changes, knownPointers) {
  const oldBody = oldOperation.value.requestBody;
  const newBody = newOperation.value.requestBody;
  const oldPointer = `${oldOperation.pointer}/requestBody`;
  const newPointer = `${newOperation.pointer}/requestBody`;
  const oldContent = isObject(oldBody?.content) ? oldBody.content : {};
  const newContent = isObject(newBody?.content) ? newBody.content : {};
  mark(knownPointers, `${newPointer}/required`);
  if (!oldBody && !newBody) return;

  const oldRequired = oldBody?.required === true;
  const newRequired = newBody?.required === true;
  if (oldRequired !== newRequired || Boolean(oldBody) !== Boolean(newBody)) {
    if (Boolean(oldBody) !== Boolean(newBody)) markSubtree(knownPointers, newPointer);
    addChange(changes, {
      kind: "request-required",
      severity: newRequired ? "breaking" : "additive",
      operationId: newOperation.operationId,
      pointer: `${newPointer}/required`,
      from: oldBody ? oldRequired : null,
      to: newBody ? newRequired : null,
    });
  }

  const oldMediaTypes = Object.keys(oldContent).sort();
  const newMediaTypes = Object.keys(newContent).sort();
  if (!arraysEqual(oldMediaTypes, newMediaTypes)) {
    addChange(changes, {
      kind: "request-media-type",
      severity: "transport",
      operationId: newOperation.operationId,
      pointer: `${newPointer}/content`,
      from: oldMediaTypes,
      to: newMediaTypes,
    });
    for (const mediaType of [...new Set([...oldMediaTypes, ...newMediaTypes])]) {
      if (!oldContent[mediaType] || !newContent[mediaType]) markSubtree(knownPointers, `${newPointer}/content/${escapePointer(mediaType)}`);
    }
  }

  for (const mediaType of oldMediaTypes.filter((value) => newContent[value])) {
    comparePayloadRoot(
      oldContent[mediaType]?.schema,
      newContent[mediaType]?.schema,
      `${newPointer}/content/${escapePointer(mediaType)}/schema`,
      "request-root",
      newOperation.operationId,
      changes,
      knownPointers,
    );
  }
  for (const mediaType of newMediaTypes.filter((value) => !oldContent[value])) {
    comparePayloadRoot(
      null,
      newContent[mediaType]?.schema,
      `${newPointer}/content/${escapePointer(mediaType)}/schema`,
      "request-root",
      newOperation.operationId,
      changes,
      knownPointers,
    );
  }
  for (const mediaType of oldMediaTypes.filter((value) => !newContent[value])) {
    comparePayloadRoot(
      oldContent[mediaType]?.schema,
      null,
      `${newPointer}/content/${escapePointer(mediaType)}/schema`,
      "request-root",
      newOperation.operationId,
      changes,
      knownPointers,
    );
  }
  mark(knownPointers, `${oldPointer}/required`);
}

function compareResponses(oldOperation, newOperation, changes, knownPointers) {
  const oldResponses = isObject(oldOperation.value.responses) ? oldOperation.value.responses : {};
  const newResponses = isObject(newOperation.value.responses) ? newOperation.value.responses : {};
  const oldStatuses = Object.keys(oldResponses).sort();
  const newStatuses = Object.keys(newResponses).sort();
  const responsePointer = `${newOperation.pointer}/responses`;
  if (!arraysEqual(oldStatuses, newStatuses)) {
    addChange(changes, {
      kind: "response-status",
      severity: "breaking",
      operationId: newOperation.operationId,
      pointer: responsePointer,
      from: oldStatuses,
      to: newStatuses,
    });
    for (const status of [...new Set([...oldStatuses, ...newStatuses])]) {
      if (!oldResponses[status] || !newResponses[status]) markSubtree(knownPointers, `${responsePointer}/${escapePointer(status)}`);
    }
  }

  const oldPrimary = primaryResponseKind(oldResponses);
  const newPrimary = primaryResponseKind(newResponses);
  if (oldPrimary !== newPrimary) {
    addChange(changes, {
      kind: "response-kind",
      severity: "transport",
      operationId: newOperation.operationId,
      pointer: responsePointer,
      from: oldPrimary,
      to: newPrimary,
    });
  }

  for (const status of oldStatuses.filter((value) => newResponses[value])) {
    const oldContent = isObject(oldResponses[status]?.content) ? oldResponses[status].content : {};
    const newContent = isObject(newResponses[status]?.content) ? newResponses[status].content : {};
    const oldMediaTypes = Object.keys(oldContent).sort();
    const newMediaTypes = Object.keys(newContent).sort();
    const contentPointer = `${responsePointer}/${escapePointer(status)}/content`;
    if (!arraysEqual(oldMediaTypes, newMediaTypes)) {
      addChange(changes, {
        kind: "response-media-type",
        severity: "transport",
        operationId: newOperation.operationId,
        pointer: contentPointer,
        status,
        from: oldMediaTypes,
        to: newMediaTypes,
      });
      for (const mediaType of [...new Set([...oldMediaTypes, ...newMediaTypes])]) {
        if (!oldContent[mediaType] || !newContent[mediaType]) markSubtree(knownPointers, `${contentPointer}/${escapePointer(mediaType)}`);
      }
    }
    for (const mediaType of oldMediaTypes.filter((value) => newContent[value])) {
      comparePayloadRoot(
        oldContent[mediaType]?.schema,
        newContent[mediaType]?.schema,
        `${contentPointer}/${escapePointer(mediaType)}/schema`,
        "response-root",
        newOperation.operationId,
        changes,
        knownPointers,
        status,
      );
    }
    for (const mediaType of newMediaTypes.filter((value) => !oldContent[value])) {
      comparePayloadRoot(
        null,
        newContent[mediaType]?.schema,
        `${contentPointer}/${escapePointer(mediaType)}/schema`,
        "response-root",
        newOperation.operationId,
        changes,
        knownPointers,
        status,
      );
    }
    for (const mediaType of oldMediaTypes.filter((value) => !newContent[value])) {
      comparePayloadRoot(
        oldContent[mediaType]?.schema,
        null,
        `${contentPointer}/${escapePointer(mediaType)}/schema`,
        "response-root",
        newOperation.operationId,
        changes,
        knownPointers,
        status,
      );
    }
  }
}

function comparePayloadRoot(oldSchema, newSchema, pointer, kind, operationId, changes, knownPointers, status) {
  const from = rootSchemaSummary(oldSchema);
  const to = rootSchemaSummary(newSchema);
  markSchemaFields(knownPointers, pointer.slice(0, pointer.lastIndexOf("/schema")), pointer.slice(0, pointer.lastIndexOf("/schema")));
  if (JSON.stringify(from) === JSON.stringify(to)) return;
  addChange(changes, {
    kind,
    severity: "transport",
    operationId,
    pointer,
    status,
    from,
    to,
  });
}

function compareOperationField(oldOperation, newOperation, field, kind, severity, changes, knownPointers) {
  const pointer = `${newOperation.pointer}/${escapePointer(field)}`;
  mark(knownPointers, pointer);
  const from = oldOperation.value[field] ?? null;
  const to = newOperation.value[field] ?? null;
  if (JSON.stringify(normalizeSemanticValue(from, field)) === JSON.stringify(normalizeSemanticValue(to, field))) return;
  addChange(changes, {
    kind,
    severity,
    operationId: newOperation.operationId,
    pointer,
    from,
    to,
  });
}

function compareDocumentField(before, after, field, kind, severity, changes, knownPointers) {
  const pointer = `#/${escapePointer(field)}`;
  mark(knownPointers, pointer);
  const from = before[field] ?? null;
  const to = after[field] ?? null;
  if (JSON.stringify(normalizeSemanticValue(from, field)) === JSON.stringify(normalizeSemanticValue(to, field))) return;
  addChange(changes, { kind, severity, pointer, from, to });
}

function compareSchemaSets(before, after, rootSchemaPointers, changes, knownPointers) {
  const oldSchemas = collectSchemas(before);
  const newSchemas = collectSchemas(after);
  for (const pointer of [...new Set([...oldSchemas.keys(), ...newSchemas.keys()])].sort()) {
    const oldSchema = oldSchemas.get(pointer);
    const newSchema = newSchemas.get(pointer);
    if (!oldSchema || !newSchema) continue;
    const root = rootSchemaPointers.has(pointer);
    compareSchemaNode(oldSchema, newSchema, pointer, root, changes, knownPointers);
  }
}

function compareSchemaNode(oldSchema, newSchema, pointer, root, changes, knownPointers) {
  markSchemaFields(knownPointers, pointer, pointer);
  if (!root) {
    const fromType = typeSummary(oldSchema);
    const toType = typeSummary(newSchema);
    if (JSON.stringify(fromType) !== JSON.stringify(toType)) {
      addChange(changes, { kind: "property-type", severity: "breaking", pointer, from: fromType, to: toType });
    }
  }

  const oldNullable = nullableValue(oldSchema);
  const newNullable = nullableValue(newSchema);
  if (oldNullable !== newNullable) {
    addChange(changes, {
      kind: "property-nullability",
      severity: newNullable ? "additive" : "breaking",
      pointer: `${pointer}/nullable`,
      from: oldNullable,
      to: newNullable,
    });
  }

  const oldBounds = boundSummary(oldSchema);
  const newBounds = boundSummary(newSchema);
  if (JSON.stringify(oldBounds) !== JSON.stringify(newBounds)) {
    addChange(changes, {
      kind: "property-bounds",
      severity: boundsSeverity(oldBounds, newBounds),
      pointer,
      from: oldBounds,
      to: newBounds,
    });
  }

  const oldRequired = new Set(Array.isArray(oldSchema.required) ? oldSchema.required : []);
  const newRequired = new Set(Array.isArray(newSchema.required) ? newSchema.required : []);
  for (const property of [...new Set([...oldRequired, ...newRequired])].sort()) {
    const from = oldRequired.has(property);
    const to = newRequired.has(property);
    if (from === to) continue;
    addChange(changes, {
      kind: "property-required",
      severity: to ? "breaking" : "additive",
      pointer: `${pointer}/required`,
      from,
      to,
      property,
    });
  }

  const oldEnum = Array.isArray(oldSchema.enum) ? [...oldSchema.enum].sort(compareJson) : null;
  const newEnum = Array.isArray(newSchema.enum) ? [...newSchema.enum].sort(compareJson) : null;
  if (JSON.stringify(oldEnum) !== JSON.stringify(newEnum)) {
    const oldSet = new Set((oldEnum ?? []).map(JSON.stringify));
    const newSet = new Set((newEnum ?? []).map(JSON.stringify));
    const widened = [...oldSet].every((entry) => newSet.has(entry));
    addChange(changes, {
      kind: widened ? "enum-widened" : "enum-narrowed",
      severity: widened ? "additive" : "breaking",
      pointer: `${pointer}/enum`,
      from: oldEnum,
      to: newEnum,
    });
  }

  if (JSON.stringify(oldSchema.discriminator ?? null) !== JSON.stringify(newSchema.discriminator ?? null)) {
    addChange(changes, {
      kind: "discriminator",
      severity: "breaking",
      pointer: `${pointer}/discriminator`,
      from: oldSchema.discriminator ?? null,
      to: newSchema.discriminator ?? null,
    });
  }

  const oldProperties = isObject(oldSchema.properties) ? oldSchema.properties : {};
  const newProperties = isObject(newSchema.properties) ? newSchema.properties : {};
  for (const property of [...new Set([...Object.keys(oldProperties), ...Object.keys(newProperties)])].sort()) {
    const propertyPointer = `${pointer}/properties/${escapePointer(property)}`;
    if (!(property in oldProperties)) {
      markSubtree(knownPointers, propertyPointer);
      addChange(changes, {
        kind: "property-added",
        severity: newRequired.has(property) ? "breaking" : "additive",
        pointer: propertyPointer,
        property,
        to: typeSummary(newProperties[property]),
      });
    } else if (!(property in newProperties)) {
      markSubtree(knownPointers, propertyPointer);
      addChange(changes, {
        kind: "property-removed",
        severity: "breaking",
        pointer: propertyPointer,
        property,
        from: typeSummary(oldProperties[property]),
      });
    }
  }
}

function compareUnknownSemanticChanges(before, after, changes, knownPointers) {
  for (const difference of collectValueDifferences(before, after)) {
    if (isKnownPointer(difference.pointer, knownPointers)) continue;
    addChange(changes, {
      kind: "review-required",
      severity: "review-required",
      pointer: difference.pointer,
      from: summarizeUnknown(difference.from),
      to: summarizeUnknown(difference.to),
      producer: "review-required",
      consumer: "review-required",
    });
  }
}

function collectValueDifferences(before, after, pointer = "#", differences = []) {
  if (JSON.stringify(before) === JSON.stringify(after)) return differences;
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length);
    for (let index = 0; index < length; index += 1) {
      collectValueDifferences(before[index], after[index], `${pointer}/${index}`, differences);
    }
    return differences;
  }
  if (isObject(before) && isObject(after)) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      collectValueDifferences(before[key], after[key], `${pointer}/${escapePointer(key)}`, differences);
    }
    return differences;
  }
  differences.push({ pointer, from: before, to: after });
  return differences;
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
        operationId,
        method: method.toUpperCase(),
        path,
        value: operation,
        pathItem,
        pathPointer: `#/paths/${escapePointer(path)}`,
        pointer: `#/paths/${escapePointer(path)}/${escapePointer(method.toLowerCase())}`,
      });
    }
  }
  return result;
}

function parameterEntries(operation) {
  const pathParameters = Array.isArray(operation.pathItem?.parameters)
    ? operation.pathItem.parameters.map((value, index) => ({ value, pointer: `${operation.pathPointer}/parameters/${index}` }))
    : [];
  const operationParameters = Array.isArray(operation.value.parameters)
    ? operation.value.parameters.map((value, index) => ({ value, pointer: `${operation.pointer}/parameters/${index}` }))
    : [];
  const parametersByIdentity = new Map();
  for (const entry of [...pathParameters, ...operationParameters]) {
    if (isObject(entry.value)) parametersByIdentity.set(`${entry.value.in ?? ""}:${entry.value.name ?? ""}`, entry);
  }
  return [...parametersByIdentity.entries()]
    .map(([identity, entry]) => ({
      operationId: operation.operationId,
      value: entry.value,
      identity,
      pointer: entry.pointer,
    }))
    .sort((left, right) => left.identity.localeCompare(right.identity));
}

function collectSchemas(document) {
  const result = new Map();
  walk(document, "#", (value, pointer) => {
    if (isSchema(value)) result.set(pointer, value);
  });
  return result;
}

function payloadRootPointers(document) {
  const pointers = new Set();
  for (const operation of operationsById(document).values()) {
    const body = operation.value.requestBody;
    for (const mediaType of Object.keys(body?.content ?? {})) {
      if (body.content[mediaType]?.schema) {
        pointers.add(`${operation.pointer}/requestBody/content/${escapePointer(mediaType)}/schema`);
      }
    }
    for (const [status, response] of Object.entries(operation.value.responses ?? {})) {
      for (const mediaType of Object.keys(response?.content ?? {})) {
        if (response.content[mediaType]?.schema) {
          pointers.add(`${operation.pointer}/responses/${escapePointer(status)}/content/${escapePointer(mediaType)}/schema`);
        }
      }
    }
  }
  return pointers;
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

function normalizeSemanticArrays(value, key = "") {
  if (Array.isArray(value)) {
    const entries = value.map((entry) => normalizeSemanticArrays(entry, key));
    if (["enum", "required", "security", "servers", "tags"].includes(key)) return entries.sort(compareJson);
    if (key === "parameters") return entries.sort((left, right) => `${left.in ?? ""}:${left.name ?? ""}`.localeCompare(`${right.in ?? ""}:${right.name ?? ""}`));
    return entries;
  }
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, normalizeSemanticArrays(child, childKey)]));
}

function normalizeSemanticValue(value, key) {
  return normalizeSemanticArrays(value, key);
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

function markParameterKnown(knownPointers, oldParameter, newParameter) {
  markSubtree(knownPointers, oldParameter.pointer);
  markSubtree(knownPointers, newParameter.pointer);
}

function markSchemaFields(knownPointers, oldPointer, newPointer) {
  for (const field of SCHEMA_KEYS) {
    mark(knownPointers, `${oldPointer}/${escapePointer(field)}`);
    mark(knownPointers, `${newPointer}/${escapePointer(field)}`);
  }
}

function mark(knownPointers, pointer) {
  knownPointers.add(pointer);
}

function markSubtree(knownPointers, pointer) {
  knownPointers.add(pointer);
}

function isKnownPointer(pointer, knownPointers) {
  for (const known of knownPointers) {
    if (pointer === known || pointer.startsWith(`${known}/`)) return true;
  }
  return false;
}

function addChange(changes, details) {
  const compatibility = {
    producer: details.producer ?? compatibilityFor(details.severity),
    consumer: details.consumer ?? compatibilityFor(details.severity),
  };
  const change = {
    kind: details.kind,
    severity: details.severity,
    compatibility,
    pointer: details.pointer,
  };
  for (const field of ["operationId", "status", "property", "from", "to"]) {
    if (details[field] !== undefined) change[field] = boundedValue(details[field]);
  }
  changes.push(change);
}

function compatibilityFor(severity) {
  if (severity === "additive") return "additive";
  if (severity === "transport") return "transport";
  if (severity === "breaking") return "breaking";
  return "review-required";
}

function deduplicateChanges(changes) {
  const seen = new Set();
  return changes.filter((change) => {
    const key = JSON.stringify(change);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classifyChanges(changes) {
  if (changes.length === 0) return "documentation";
  for (const severity of SEVERITY_ORDER) {
    if (changes.some((change) => change.severity === severity)) return severity;
  }
  return "review-required";
}

function schemaConstraintSummary(schema) {
  if (!isObject(schema)) return null;
  const summary = {};
  for (const key of ["$ref", "type", "format", "nullable", ...BOUND_KEYS, "pattern"]) {
    if (schema[key] !== undefined) summary[key] = schema[key];
  }
  return summary;
}

function rootSchemaSummary(schema) {
  if (!isObject(schema)) return schema ? { kind: typeof schema } : null;
  return {
    ref: typeof schema.$ref === "string" ? schema.$ref : null,
    type: schema.type ?? null,
    format: schema.format ?? null,
    nullable: nullableValue(schema),
  };
}

function typeSummary(schema) {
  if (!isObject(schema)) return schema ? { kind: typeof schema } : null;
  return {
    ref: typeof schema.$ref === "string" ? schema.$ref : null,
    type: schema.type ?? null,
    format: schema.format ?? null,
  };
}

function boundSummary(schema) {
  if (!isObject(schema)) return null;
  return Object.fromEntries(BOUND_KEYS.filter((key) => schema[key] !== undefined).map((key) => [key, schema[key]]));
}

function parameterSummary(parameter) {
  return {
    name: parameter.name ?? null,
    in: parameter.in ?? null,
    required: parameter.required === true,
  };
}

function nullableValue(schema) {
  if (!isObject(schema)) return false;
  if (schema.nullable === true) return true;
  return Array.isArray(schema.type) && schema.type.includes("null");
}

function schemaConstraintSeverity(from, to) {
  if (from === null || to === null) return "transport";
  return "breaking";
}

function boundsSeverity(from, to) {
  for (const key of BOUND_KEYS) {
    if (from?.[key] === undefined || to?.[key] === undefined) return "review-required";
    if (from[key] === to[key]) continue;
    if (["minimum", "minLength", "minItems"].includes(key)) return to[key] > from[key] ? "breaking" : "additive";
    if (["maximum", "maxLength", "maxItems"].includes(key)) return to[key] < from[key] ? "breaking" : "additive";
    return "review-required";
  }
  return "review-required";
}

function boundedValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.length > 256 ? `${value.slice(0, 253)}...` : value;
  if (Array.isArray(value)) return value.slice(0, 32).map(boundedValue);
  if (isObject(value)) {
    const result = {};
    for (const key of Object.keys(value).sort().slice(0, 32)) result[key] = boundedValue(value[key]);
    return result;
  }
  return null;
}

function summarizeUnknown(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return `<string:${value.length}>`;
  if (Array.isArray(value)) return `<array:${value.length}>`;
  if (isObject(value)) return `<object:${Object.keys(value).length}>`;
  return `<${typeof value}>`;
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

function compareJson(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function escapePointer(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
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

function isSchema(value) {
  return isObject(value) && Object.keys(value).some((key) => SCHEMA_KEYS.has(key));
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
