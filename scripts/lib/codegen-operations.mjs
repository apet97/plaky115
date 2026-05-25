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

export function buildOperationModule(op) {
  const params = pathParams(op.path);
  const hasBody = op.method !== "GET" && op.method !== "DELETE";
  const requestType = `paths["${op.path}"]["${op.method.toLowerCase()}"]`;
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${op.operationId}`);
  lines.push(`// Regenerate: npm run generate:operations`);
  lines.push(`import type { paths } from "../types.js";`);
  lines.push(`import { request } from "../../runtime/http.js";`);
  lines.push(`import type { PlakyRequestOptions } from "../../runtime/http.js";`);
  lines.push(``);
  lines.push(`type RequestOp = ${requestType};`);
  if (hasBody) lines.push(`type RequestBodyType = RequestOp extends { requestBody: { content: { "application/json": infer B } } } ? B : never;`);
  lines.push(`type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;`);
  lines.push(``);
  lines.push(`export type ${op.operationId}Params = {`);
  for (const p of params) lines.push(`  ${p}: string | number;`);
  if (hasBody) lines.push(`  body: RequestBodyType;`);
  lines.push(`  query?: QueryParamsType | undefined;`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`export type ${op.operationId}Response =`);
  lines.push(`  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :`);
  lines.push(`  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :`);
  lines.push(`  RequestOp extends { responses: { 204: unknown } } ? void :`);
  lines.push(`  unknown;`);
  lines.push(``);
  lines.push(`export async function ${op.operationId}(`);
  lines.push(`  params: ${op.operationId}Params,`);
  lines.push(`  options: PlakyRequestOptions,`);
  lines.push(`): Promise<${op.operationId}Response> {`);
  lines.push(`  const path = \`${op.path.replace(/\{([^}]+)\}/g, "${params.$1}")}\`;`);
  lines.push(`  return request<${op.operationId}Response>({`);
  lines.push(`    method: "${op.method}",`);
  lines.push(`    path,`);
  lines.push(`    query: params.query as Record<string, unknown> | undefined,`);
  if (hasBody) lines.push(`    body: params.body,`);
  lines.push(`    operationId: "${op.operationId}",`);
  lines.push(`  }, options);`);
  lines.push(`}`);
  lines.push(``);
  return lines.join("\n");
}

export function buildOperationTable(ops) {
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
  lines.push(`// Regenerate: npm run generate:operations`);
  lines.push(``);
  lines.push(`export const operationTable = [`);
  for (const op of ops) {
    lines.push(`  {`);
    lines.push(`    operationId: "${op.operationId}",`);
    lines.push(`    method: "${op.method}" as const,`);
    lines.push(`    path: "${op.path}",`);
    lines.push(`    mcpName: "${op.mcpName}",`);
    lines.push(`    scopes: ${JSON.stringify(op.scopes ?? [])} as const,`);
    lines.push(`    readOnly: ${op.readOnly === true},`);
    lines.push(`    destructive: ${op.destructive === true},`);
    lines.push(`    list: ${op.list === true},`);
    lines.push(`    mutation: ${op.mutation === true},`);
    if (op.pagination) lines.push(`    pagination: ${JSON.stringify(op.pagination)} as const,`);
    lines.push(`  },`);
  }
  lines.push(`] as const;`);
  lines.push(``);
  lines.push(`export type OperationId = (typeof operationTable)[number]["operationId"];`);
  lines.push(``);
  return lines.join("\n");
}
