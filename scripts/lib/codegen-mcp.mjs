import { describeOperation, slug } from "./codegen-common.mjs";

export function buildRawToolModule(op) {
  const descriptor = describeOperation(op);
  const { pathParameters, queryParameters } = descriptor;
  const hasJsonBody = descriptor.requestKind === "json";
  const hasMultipartBody = descriptor.requestKind === "multipart";
  const hasQuery = queryParameters.length > 0;
  const isVoid = descriptor.isVoid;
  const isArray = descriptor.isArray;
  const isMutation = descriptor.mutation;
  const camelOp = op.operationId;
  const targetParameters = pathParameters.filter((parameter) => parameter.name.endsWith("Id"));
  const createdIdKey = descriptor.createdIdPointer !== undefined ? createdIdKeyFor(camelOp) : undefined;
  const needsInt64Id = [...pathParameters, ...queryParameters].some((parameter) => usesInt64(parameter.schema));
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${camelOp}`);
  lines.push(`import { z } from "zod/v3";`);
  lines.push(`import { request } from "plaky115/runtime/http.js";`);
  if (needsInt64Id) lines.push(`import { int64Id } from "../../runtime/ids.js";`);
  if (hasMultipartBody) lines.push(`import { buildFileUploadFormData } from "../../runtime/upload.js";`);
  lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
  lines.push(``);
  lines.push(`const args = z.object({`);
  for (const parameter of [...pathParameters, ...queryParameters]) {
    lines.push(`  ${propertyKey(parameter.name)}: ${zodParameter(parameter)},`);
  }
  if (hasJsonBody) {
    const bodySchema = zodRequestBody(op);
    const optional = op.request.required ? "" : ".optional()";
    lines.push(`  body: ${bodySchema}.describe("JSON request body for ${op.summary ?? op.operationId}.")${optional},`);
  }
  if (hasMultipartBody) {
    lines.push(`  fileBase64: z.string().describe("Canonical base64 file content; decoded size is bounded before upload."),`);
    lines.push(`  fileName: z.string().min(1).describe("File name sent in the multipart upload."),`);
    lines.push(`  contentType: z.string().describe("Optional file media type, such as application/pdf.").optional(),`);
  }
  lines.push(`}).strict();`);
  const outputSchema = isVoid
    ? `z.object({ ok: z.boolean() })`
    : isArray
      ? `z.object({ data: z.array(z.unknown()) })`
      : responseObjectSchema(descriptor);
  lines.push(`const output = ${outputSchema};`);
  const rawOutputSchema = isVoid ? null : isArray ? `z.array(z.unknown())` : responseObjectSchema(descriptor);
  if (rawOutputSchema) lines.push(`const rawOutput = ${rawOutputSchema};`);
  lines.push(``);
  lines.push(`export const ${camelOp}Tool: McpToolDefinition = {`);
  lines.push(`  name: "${op.mcpName}",`);
  lines.push(`  title: ${JSON.stringify(op.mcpTitle ?? op.summary ?? op.operationId)},`);
  lines.push(`  description: ${JSON.stringify(op.summary ?? op.operationId)},`);
  lines.push(`  scopes: ${JSON.stringify(op.scopes ?? [])},`);
  lines.push(`  sensitiveOutput: ${op.sensitiveOutput === true},`);
  lines.push(`  annotations: {`);
  lines.push(`    readOnlyHint: ${op.readOnly === true},`);
  lines.push(`    destructiveHint: ${op.destructive === true},`);
  lines.push(`    idempotentHint: ${op.idempotent === true},`);
  lines.push(`    openWorldHint: ${op.openWorld === true},`);
  lines.push(`  },`);
  lines.push(`  inputSchema: args,`);
  lines.push(`  outputSchema: output,`);
  const usesInput = pathParameters.length > 0 || hasQuery || hasJsonBody || hasMultipartBody;
  lines.push(`  async handler(${usesInput ? "input" : "_input"}, ctx) {`);
  if (usesInput) lines.push(`    const parsed = args.parse(input);`);
  if (hasQuery) {
    lines.push(`    const query = {`);
    for (const parameter of queryParameters) {
      const access = propertyAccess("parsed", parameter.name);
      lines.push(`      ...(${access} !== undefined ? { ${propertyKey(parameter.name)}: ${access} } : {}),`);
    }
    lines.push(`    };`);
  }
  if (hasMultipartBody) {
    lines.push(`    const body = buildFileUploadFormData({`);
    lines.push(`      fileBase64: parsed.fileBase64,`);
    lines.push(`      fileName: parsed.fileName,`);
    lines.push(`      ...(parsed.contentType !== undefined ? { contentType: parsed.contentType } : {}),`);
    lines.push(`    });`);
  }
  const requestType = isArray ? "<unknown[]>" : isVoid ? "<void>" : "<Record<string, unknown>>";
  if (isMutation) {
    lines.push(isVoid ? `    await ctx.attempt.mutate({` : `    const result = await ctx.attempt.mutate({`);
    lines.push(`      operation: "${camelOp}",`);
    const targetEntries = targetParameters.map((parameter) => `${propertyKey(parameter.name)}: String(${propertyAccess("parsed", parameter.name)})`);
    lines.push(`      targetIds: ${targetEntries.length === 0 ? "{}" : `{ ${targetEntries.join(", ")} }`},`);
    if (createdIdKey !== undefined) lines.push(`      createdIdKey: "${createdIdKey}",`);
    lines.push(`      run: async () => {`);
    lines.push(isVoid ? `        await request${requestType}({` : `        const result = await request${requestType}({`);
    lines.push(`          method: "${op.method}",`);
    lines.push(`          path: ${formatTsPath(op.path, pathParameters)},`);
    if (hasQuery) lines.push(`          query,`);
    if (hasJsonBody) lines.push(`          body: parsed.body,`);
    if (hasMultipartBody) lines.push(`          body,`);
    if (isVoid) lines.push(`          responseType: "void",`);
    lines.push(`          operationId: "${camelOp}",`);
    lines.push(`        }, ctx.requestOptions);`);
    if (rawOutputSchema) lines.push(`        rawOutput.parse(result);`);
    if (!isVoid) lines.push(`        return result;`);
    lines.push(`      },`);
    lines.push(`    });`);
  } else {
    lines.push(isVoid ? `    await request${requestType}({` : `    const result = await request${requestType}({`);
    lines.push(`      method: "${op.method}",`);
    lines.push(`      path: ${formatTsPath(op.path, pathParameters)},`);
    if (hasQuery) lines.push(`      query,`);
    if (hasJsonBody) lines.push(`      body: parsed.body,`);
    if (hasMultipartBody) lines.push(`      body,`);
    if (isVoid) lines.push(`      responseType: "void",`);
    lines.push(`      operationId: "${camelOp}",`);
    lines.push(`    }, ctx.requestOptions);`);
    if (rawOutputSchema) lines.push(`    rawOutput.parse(result);`);
  }
  if (isVoid) {
    lines.push(`    return ctx.respond({ ok: true }, { compactKind: ${JSON.stringify(op.compactKind)} });`);
  } else if (isArray) {
    lines.push(`    return ctx.respond(result, { compactKind: ${JSON.stringify(op.compactKind)} });`);
  } else {
    lines.push(`    return ctx.respond(result, { compactKind: ${JSON.stringify(op.compactKind)} });`);
  }
  lines.push(`  },`);
  lines.push(`};`);
  lines.push(``);
  return lines.join("\n");
}

function formatTsPath(path, parameters) {
  if (parameters.length === 0) return JSON.stringify(path);
  const parameterNames = new Set(parameters.map(({ name }) => name));
  const escaped = path
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\{([^}]+)\}/g, (_, key) => {
      if (!parameterNames.has(key)) throw new Error(`path placeholder ${key} has no path parameter metadata`);
      return `\${encodeURIComponent(String(${propertyAccess("parsed", key)}))}`;
    });
  return `\`${escaped}\``;
}

function zodParameter(parameter) {
  let schema = zodSchema(parameter.schema);
  const description = parameter.description ?? `${parameter.name} ${parameter.in} parameter for this Plaky operation.`;
  schema += `.describe(${JSON.stringify(description)})`;
  if (!parameter.required) schema += ".optional()";
  return schema;
}

function zodSchema(schema) {
  let result;
  if (Array.isArray(schema.enum)) {
    result = schema.enum.every((value) => typeof value === "string")
      ? `z.enum(${JSON.stringify(schema.enum)})`
      : `z.union([${schema.enum.map((value) => `z.literal(${JSON.stringify(value)})`).join(", ")}])`;
  } else {
    switch (schema.type) {
      case "string": result = "z.string()"; break;
      case "integer": result = schema.format === "int64" ? "int64Id" : "z.number().int()"; break;
      case "number": result = "z.number()"; break;
      case "boolean": result = "z.boolean()"; break;
      case "array": result = `z.array(${zodSchema(schema.items)})`; break;
      default: throw new Error(`unsupported parameter schema type: ${schema.type}`);
    }
  }
  return applyZodConstraints(result, schema);
}

function applyZodConstraints(expression, schema) {
  if (schema.type === "string") {
    if (schema.minLength !== undefined) expression += `.min(${numberLiteral(schema.minLength)})`;
    if (schema.maxLength !== undefined) expression += `.max(${numberLiteral(schema.maxLength)})`;
    if (schema.pattern !== undefined) expression += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
  } else if ((schema.type === "integer" || schema.type === "number") && schema.format !== "int64") {
    if (schema.minimum !== undefined) expression += `.min(${numberLiteral(schema.minimum)})`;
    if (schema.maximum !== undefined) expression += `.max(${numberLiteral(schema.maximum)})`;
    if (schema.exclusiveMinimum !== undefined) {
      const value = schema.exclusiveMinimum === true ? schema.minimum : schema.exclusiveMinimum;
      if (value !== undefined) expression += `.gt(${numberLiteral(value)})`;
    }
    if (schema.exclusiveMaximum !== undefined) {
      const value = schema.exclusiveMaximum === true ? schema.maximum : schema.exclusiveMaximum;
      if (value !== undefined) expression += `.lt(${numberLiteral(value)})`;
    }
    if (schema.multipleOf !== undefined) expression += `.multipleOf(${numberLiteral(schema.multipleOf)})`;
  } else if (schema.type === "array") {
    if (schema.minItems !== undefined) expression += `.min(${numberLiteral(schema.minItems)})`;
    if (schema.maxItems !== undefined) expression += `.max(${numberLiteral(schema.maxItems)})`;
    if (schema.uniqueItems === true) expression += `.refine((value) => new Set(value).size === value.length, "must contain unique items")`;
  }
  return expression;
}

function zodRequestBody(operation) {
  let expression = "z.record(z.unknown())";
  const required = operation.request?.requiredProperties ?? [];
  if (operation.request?.rootKind === "object" && required.length > 0) {
    const checks = required.map((property) =>
      `if (!Object.prototype.hasOwnProperty.call(body, ${JSON.stringify(property)})) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [${JSON.stringify(property)}], message: "required" });`
    ).join(" ");
    expression += `.superRefine((body, ctx) => { ${checks} })`;
  }
  return expression;
}

function responseObjectSchema(descriptor) {
  const required = new Set(descriptor.successRequiredProperties ?? []);
  if (descriptor.createdIdPointer === "$.id") required.add("id");
  if (descriptor.sensitiveLink) required.add("url");
  const fields = [...required].map((property) => {
    if (property === "data" && descriptor.isPaged) return "data: z.array(z.unknown())";
    if (property === "hasMore" && descriptor.isPaged) return "hasMore: z.boolean()";
    if (property === "url" && descriptor.sensitiveLink) {
      return "url: z.string().url().refine((value) => value.startsWith(\"https://\"), \"must use HTTPS\")";
    }
    return `${propertyKey(property)}: z.unknown()`;
  });
  if (descriptor.sensitiveLink) fields.push("expiresInSeconds: z.number().int().nonnegative().optional()");
  const properties = fields.length === 0 ? "" : ` ${fields.join(", ")} `;
  return `z.object({${properties}}).passthrough()`;
}

function numberLiteral(value) {
  return JSON.stringify(value);
}

function usesInt64(schema) {
  return schema?.type === "integer" && schema.format === "int64"
    || schema?.type === "array" && usesInt64(schema.items);
}

function propertyKey(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

function propertyAccess(object, name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? `${object}.${name}` : `${object}[${JSON.stringify(name)}]`;
}

export function buildRawToolIndex(ops) {
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
  for (const op of ops) lines.push(`export { ${op.operationId}Tool } from "./${slug(op.operationId)}.js";`);
  lines.push(``);
  lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
  for (const op of ops) lines.push(`import { ${op.operationId}Tool } from "./${slug(op.operationId)}.js";`);
  lines.push(``);
  lines.push(`export const rawTools: McpToolDefinition[] = [${ops.map((o) => `${o.operationId}Tool`).join(", ")}];`);
  lines.push(``);
  return lines.join("\n");
}

function createdIdKeyFor(operationId) {
  const keys = {
    createItem: "itemId",
    createItemComment: "itemCommentId",
    createItemGroup: "itemGroupId",
    uploadItemFile: "itemFileId",
  };
  const key = keys[operationId];
  if (key === undefined) throw new Error(`${operationId}: created ID metadata has no receipt target key`);
  return key;
}
