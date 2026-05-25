import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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
  const workflows = [
    { id: "wf:workspace.map", title: "Workspace map", text: "Discover spaces and boards before calling item workflows. Returns compact tree by default." },
    { id: "wf:items.search", title: "Search items", text: "Find items across boards by title fragment, status, person, or tag." },
    { id: "wf:items.create", title: "Create item", text: "Create an item with title and optional field values. Supports dry-run." },
    { id: "wf:items.updateFields", title: "Bulk update item fields", text: "Update many field values on one item in one call. Dry-run by default." },
    { id: "wf:comments.add", title: "Add comment", text: "Append a comment to an item." },
    { id: "wf:comments.thread", title: "Comment thread", text: "Read a comment thread compactly." },
    { id: "wf:export.items", title: "Export items", text: "Export board items as JSONL or CSV." },
  ];
  for (const wf of workflows) entries.push({ ...wf, kind: "workflow", scopes: ["read"] });

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
  lines.push(`  scopes: Array<"read" | "write" | "destructive">;`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`export const docsIndex: PlakyDocsEntry[] = ${JSON.stringify(entries, null, 2)};`);
  lines.push(``);
  return lines.join("\n");
}
