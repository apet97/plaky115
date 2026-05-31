import { slug, pathParams } from "./codegen-common.mjs";

export function buildRawToolModule(op) {
  const params = pathParams(op.path);
  const hasBody = op.method !== "GET" && op.method !== "DELETE";
  const camelOp = op.operationId;
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${camelOp}`);
  lines.push(`import { z } from "zod/v3";`);
  lines.push(`import { request } from "plaky115/runtime/http.js";`);
  lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
  lines.push(``);
  lines.push(`const args = z.object({`);
  for (const p of params) lines.push(`  ${p}: z.union([z.string(), z.number()]).describe(${JSON.stringify(paramDescription(p))}),`);
  if (op.pagination) {
    lines.push(`  page: z.number().int().min(1).describe("One-based result page to request.").optional(),`);
    lines.push(`  pageSize: z.number().int().min(1).max(200).describe("Maximum number of records to return for this page.").optional(),`);
  }
  if (hasBody) lines.push(`  body: z.record(z.unknown()).describe("JSON request body for ${op.summary ?? op.operationId}.").optional(),`);
  lines.push(`});`);
  lines.push(`const output = ${op.method === "DELETE" ? `z.object({ ok: z.boolean() })` : `z.object({}).passthrough()`};`);
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
  lines.push(`  outputSchema: output,`);
  const usesInput = params.length > 0 || op.pagination || hasBody;
  lines.push(`  async handler(${usesInput ? "input" : "_input"}, ctx) {`);
  if (usesInput) lines.push(`    const parsed = args.parse(input);`);
  if (op.pagination) {
    lines.push(`    const query = {`);
    lines.push(`      ...(parsed.page !== undefined ? { page: parsed.page } : {}),`);
    lines.push(`      ...(parsed.pageSize !== undefined ? { pageSize: parsed.pageSize } : {}),`);
    lines.push(`    };`);
  }
  if (op.method === "DELETE") {
    lines.push(`    await request({`);
  } else {
    lines.push(`    const result = await request({`);
  }
  lines.push(`      method: "${op.method}",`);
  lines.push(`      path: ${formatTsPath(op.path, params)},`);
  if (op.pagination) lines.push(`      query,`);
  if (hasBody) lines.push(`      body: parsed.body,`);
  if (op.method === "DELETE") lines.push(`      responseType: "void",`);
  lines.push(`      operationId: "${camelOp}",`);
  lines.push(`    }, ctx.requestOptions);`);
  if (op.method === "DELETE") {
    lines.push(`    return ctx.respond({ ok: true }, { compactKind: "raw" });`);
  } else {
    lines.push(`    return ctx.respond(result, { compactKind: ${pickCompact(op)} });`);
  }
  lines.push(`  },`);
  lines.push(`};`);
  lines.push(``);
  return lines.join("\n");
}

function formatTsPath(path, params) {
  if (params.length === 0) return JSON.stringify(path);
  const escaped = path
    .replace(/`/g, "\\`")
    .replace(/\{([^}]+)\}/g, (_, key) => `\${encodeURIComponent(String(parsed.${key}))}`);
  return `\`${escaped}\``;
}

function pickCompact(op) {
  if (op.path.includes("/items") && !op.path.includes("/comments")) return `"item"`;
  if (op.path.includes("/boards")) return `"board"`;
  if (op.path.includes("/spaces")) return `"space"`;
  if (op.path.includes("/comments")) return `"comment"`;
  return `"raw"`;
}

function paramDescription(param) {
  const descriptions = {
    spaceId: "Plaky space ID for the target workspace area.",
    boardId: "Plaky board ID within the selected space.",
    itemId: "Plaky item ID within the selected board.",
    itemFieldKey: "Field key to update, such as status-1 or string-2.",
    itemCommentId: "Plaky comment ID on the selected item.",
    teamId: "Plaky team ID to retrieve.",
  };
  return descriptions[param] ?? `${param} path parameter for this Plaky operation.`;
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
