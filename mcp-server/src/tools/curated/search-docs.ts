import { z } from "zod/v3";
import { docsIndex, type PlakyDocsEntry } from "../../runtime/docs-index.js";
import type { McpToolDefinition } from "../../runtime/types.js";

export type SearchHit = { id: string; title: string; kind: string; score: number; text?: string };

const searchHitSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  score: z.number(),
  text: z.string().optional(),
});

export function searchDocs(query: string, limit = 5, opts: { includeRaw?: boolean } = {}): SearchHit[] {
  const terms = query.toLowerCase().split(/[^a-z0-9_.]+/).filter(Boolean);
  if (terms.length === 0) return [];
  const scored = docsIndex
    .map((entry) => ({ entry, score: scoreEntry(entry, terms) }))
    .filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ entry, score }) => {
    const hit: SearchHit = { id: entry.id, title: entry.title, kind: entry.kind, score };
    if (opts.includeRaw === true) hit.text = entry.text;
    return hit;
  });
}

function scoreEntry(entry: PlakyDocsEntry, terms: string[]): number {
  const haystack = `${entry.title}\n${entry.text}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) score++;
    if (entry.id.toLowerCase().includes(term)) score += 2;
    if (entry.title.toLowerCase().includes(term)) score += 1;
  }
  return score;
}

export const searchDocsTool: McpToolDefinition = {
  name: "plaky_search_docs",
  title: "Search Plaky docs",
  description: "Search the Plaky toolkit docs and operation catalogue. Returns compact hits by default; pass includeRaw to get full text.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    query: z.string().min(1).describe("Search text for docs, workflows, or operation names."),
    limit: z.number().int().min(1).max(20).describe("Maximum number of matching entries to return.").optional(),
    includeRaw: z.boolean().describe("Include full source text for each matched entry.").optional(),
  }),
  outputSchema: z.object({
    hits: z.array(searchHitSchema),
  }),
  handler(input, ctx) {
    const { query, limit, includeRaw } = input as { query: string; limit?: number; includeRaw?: boolean };
    const hits = searchDocs(query, limit ?? 5, { includeRaw: includeRaw === true });
    return ctx.respond({ hits });
  },
};
