import { slug } from "./codegen-common.mjs";

export function buildRawToolModule(op) {
  const pathParameters = op.parameters.filter((parameter) => parameter.in === "path");
  const queryParameters = uniqueParameters([
    ...op.parameters.filter((parameter) => parameter.in === "query"),
    ...(op.pagination?.inputs ?? []),
  ]);
  const hasJsonBody = op.request.kind === "json";
  const hasMultipartBody = op.request.kind === "multipart";
  if (hasMultipartBody) validateMultipartRequest(op);
  const hasQuery = queryParameters.length > 0;
  const isVoid = op.success.kind === "void";
  const isArray = op.success.kind === "json-array";
  const camelOp = op.operationId;
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${camelOp}`);
  lines.push(`import { z } from "zod/v3";`);
  lines.push(`import { request } from "plaky115/runtime/http.js";`);
  if (hasMultipartBody) lines.push(`import { buildFileUploadFormData } from "../../runtime/upload.js";`);
  lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
  lines.push(``);
  lines.push(`const args = z.object({`);
  for (const parameter of [...pathParameters, ...queryParameters]) {
    lines.push(`  ${propertyKey(parameter.name)}: ${zodParameter(parameter)},`);
  }
  if (hasJsonBody) {
    const optional = op.request.required ? "" : ".optional()";
    lines.push(`  body: z.record(z.unknown()).describe("JSON request body for ${op.summary ?? op.operationId}.")${optional},`);
  }
  if (hasMultipartBody) {
    lines.push(`  fileBase64: z.string().describe("Canonical base64 file content; decoded size is bounded before upload."),`);
    lines.push(`  fileName: z.string().min(1).describe("File name sent in the multipart upload."),`);
    lines.push(`  contentType: z.string().describe("Optional file media type, such as application/pdf.").optional(),`);
  }
  lines.push(`});`);
  const outputSchema = isVoid
    ? `z.object({ ok: z.boolean() })`
    : isArray
      ? `z.object({ data: z.array(z.unknown()) })`
      : `z.object({}).passthrough()`;
  lines.push(`const output = ${outputSchema};`);
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
  lines.push(isVoid ? `    await request${requestType}({` : `    const result = await request${requestType}({`);
  lines.push(`      method: "${op.method}",`);
  lines.push(`      path: ${formatTsPath(op.path, pathParameters)},`);
  if (hasQuery) lines.push(`      query,`);
  if (hasJsonBody) lines.push(`      body: parsed.body,`);
  if (hasMultipartBody) lines.push(`      body,`);
  if (isVoid) lines.push(`      responseType: "void",`);
  lines.push(`      operationId: "${camelOp}",`);
  lines.push(`    }, ctx.requestOptions);`);
  if (isVoid) {
    lines.push(`    return ctx.respond({ ok: true }, { compactKind: ${JSON.stringify(op.compactKind)} });`);
  } else if (isArray) {
    lines.push(`    return ctx.respond({ data: result }, { compactKind: ${JSON.stringify(op.compactKind)} });`);
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
    .replace(/`/g, "\\`")
    .replace(/\{([^}]+)\}/g, (_, key) => {
      if (!parameterNames.has(key)) throw new Error(`path placeholder ${key} has no path parameter metadata`);
      return `\${encodeURIComponent(String(${propertyAccess("parsed", key)}))}`;
    });
  return `\`${escaped}\``;
}

function uniqueParameters(parameters) {
  const seen = new Set();
  return parameters.filter(({ name }) => {
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function validateMultipartRequest(op) {
  const parts = op.request.parts;
  const valid = parts.length === 1
    && parts[0].name === "file"
    && parts[0].required === true
    && parts[0].type === "string"
    && parts[0].format === "binary";
  if (!valid) {
    throw new Error(`${op.operationId}: expected a single required binary multipart part named file`);
  }
}

function zodParameter(parameter) {
  let schema = zodSchema(parameter.schema);
  const description = parameter.description ?? `${parameter.name} ${parameter.in} parameter for this Plaky operation.`;
  schema += `.describe(${JSON.stringify(description)})`;
  if (!parameter.required) schema += ".optional()";
  return schema;
}

function zodSchema(schema) {
  if (Array.isArray(schema.enum)) {
    if (schema.enum.every((value) => typeof value === "string")) return `z.enum(${JSON.stringify(schema.enum)})`;
    return `z.union([${schema.enum.map((value) => `z.literal(${JSON.stringify(value)})`).join(", ")}])`;
  }
  switch (schema.type) {
    case "string": return "z.string()";
    case "integer": return "z.number().int()";
    case "number": return "z.number()";
    case "boolean": return "z.boolean()";
    case "array": return `z.array(${zodSchema(schema.items)})`;
    default: throw new Error(`unsupported parameter schema type: ${schema.type}`);
  }
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
