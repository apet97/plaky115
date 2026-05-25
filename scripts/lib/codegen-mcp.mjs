import { slug, pathParams } from "./codegen-operations.mjs";

export function buildRawToolModule(op) {
  const params = pathParams(op.path);
  const hasBody = op.method !== "GET" && op.method !== "DELETE";
  const camelOp = op.operationId;
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${camelOp}`);
  lines.push(`import { z } from "zod/v3";`);
  lines.push(`import { ${camelOp} } from "plaky115/operations/${slug(camelOp)}.js";`);
  lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
  lines.push(``);
  lines.push(`const args = z.object({`);
  for (const p of params) lines.push(`  ${p}: z.union([z.string(), z.number()]).describe("${p}"),`);
  if (op.pagination) {
    lines.push(`  page: z.number().int().min(1).optional(),`);
    lines.push(`  pageSize: z.number().int().min(1).max(200).optional(),`);
  }
  if (hasBody) lines.push(`  body: z.record(z.unknown()).optional(),`);
  lines.push(`});`);
  lines.push(``);
  lines.push(`export const ${camelOp}Tool: McpToolDefinition = {`);
  lines.push(`  name: "${op.mcpName}",`);
  lines.push(`  title: ${JSON.stringify(op.mcpTitle ?? op.summary ?? op.operationId)},`);
  lines.push(`  description: ${JSON.stringify(op.summary ?? op.operationId)},`);
  lines.push(`  scopes: ${JSON.stringify(op.scopes ?? [])},`);
  lines.push(`  annotations: {`);
  lines.push(`    readOnlyHint: ${op.readOnly === true},`);
  lines.push(`    destructiveHint: ${op.destructive === true},`);
  lines.push(`    idempotentHint: ${op.idempotent === true},`);
  lines.push(`    openWorldHint: ${op.openWorld === true},`);
  lines.push(`  },`);
  lines.push(`  inputSchema: args,`);
  lines.push(`  async handler(input, ctx) {`);
  lines.push(`    const result = await ${camelOp}(input as Parameters<typeof ${camelOp}>[0], ctx.requestOptions);`);
  lines.push(`    return ctx.respond(result, { compactKind: ${pickCompact(op)} });`);
  lines.push(`  },`);
  lines.push(`};`);
  lines.push(``);
  return lines.join("\n");
}

function pickCompact(op) {
  if (op.path.includes("/items") && !op.path.includes("/comments")) return `"item"`;
  if (op.path.includes("/boards")) return `"board"`;
  if (op.path.includes("/spaces")) return `"space"`;
  if (op.path.includes("/comments")) return `"comment"`;
  return `"raw"`;
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
