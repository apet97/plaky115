import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function buildDocsIndex(root, metadata) {
  const entries = [];
  for (const op of metadata.operations) {
    entries.push({
      id: `op:${op.operationId}`,
      kind: "operation",
      title: op.mcpTitle ?? op.summary ?? op.operationId,
      text: `${op.summary ?? ""}\nPath: ${op.method} ${op.path}\nMCP tool: ${op.mcpName}\nScopes: ${(op.scopes ?? []).join(", ") || "none"}`,
      operationId: op.operationId,
      scopes: op.scopes ?? [],
    });
  }
  for (const workflow of loadWorkflowRegistry(root)) {
    entries.push({
      id: `wf:${workflow.id}`,
      kind: "workflow",
      title: workflow.title,
      text: `${workflow.description}\n${workflow.docsText}`,
      workflowId: workflow.id,
      mutation: workflow.mutation,
      destructive: workflow.destructive,
      openWorld: workflow.openWorld,
      schemaKey: workflow.schemaKey,
      scopes: workflow.scopes,
    });
  }

  const guideFiles = ["README.md", "docs/live-smoke.md", "docs/install-snippets.md"];
  for (const rel of guideFiles) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8").slice(0, 4096);
    entries.push({ id: `guide:${rel}`, kind: "guide", title: rel, text, scopes: ["read"] });
  }
  return entries;
}

export function emitDocsIndex(entries) {
  const lines = [];
  lines.push(`// AUTO-GENERATED. Source: metadata + repo docs.`);
  lines.push(`// Regenerate: npm run generate:docs-index`);
  lines.push(``);
  lines.push(`export type PlakyDocsEntry = {`);
  lines.push(`  id: string;`);
  lines.push(`  kind: "operation" | "workflow" | "guide";`);
  lines.push(`  title: string;`);
  lines.push(`  text: string;`);
  lines.push(`  operationId?: string;`);
  lines.push(`  workflowId?: string;`);
  lines.push(`  mutation?: boolean;`);
  lines.push(`  destructive?: boolean;`);
  lines.push(`  openWorld?: boolean;`);
  lines.push(`  schemaKey?: string;`);
  lines.push(`  scopes: Array<"read" | "write" | "destructive">;`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`export const docsIndex: PlakyDocsEntry[] = ${JSON.stringify(entries, null, 2)};`);
  lines.push(``);
  return lines.join("\n");
}

function loadWorkflowRegistry(root) {
  const registryPath = join(root, "mcp-server/src/tools/curated/workflow-registry.ts");
  const registryUrl = pathToFileURL(registryPath).href;
  const localBun = join(root, "mcp-server/node_modules/.bin/bun");
  const command = existsSync(localBun) ? localBun : "bun";
  const script = [
    `import { workflowRegistry } from ${JSON.stringify(registryUrl)};`,
    "process.stdout.write(JSON.stringify(workflowRegistry));",
  ].join("\n");
  const result = spawnSync(command, ["-e", script], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`workflow registry load failed: ${result.stderr || result.stdout}`);
  }
  let registry;
  try {
    registry = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error("workflow registry did not produce JSON", { cause: error });
  }
  if (!Array.isArray(registry) || registry.length === 0) throw new Error("workflow registry must be a non-empty array");
  const ids = new Set();
  for (const entry of registry) {
    if (entry === null || typeof entry !== "object") throw new Error("workflow registry entries must be objects");
    for (const key of ["id", "title", "description", "schemaKey", "docsText"]) {
      if (typeof entry[key] !== "string" || entry[key].length === 0) throw new Error(`workflow registry entry ${key} is invalid`);
    }
    if (ids.has(entry.id)) throw new Error(`duplicate workflow registry id ${entry.id}`);
    ids.add(entry.id);
    if (!Array.isArray(entry.scopes) || entry.scopes.length === 0) throw new Error(`workflow ${entry.id} has no scopes`);
    if (typeof entry.mutation !== "boolean" || typeof entry.destructive !== "boolean" || typeof entry.openWorld !== "boolean") {
      throw new Error(`workflow ${entry.id} has invalid safety metadata`);
    }
  }
  return registry;
}
