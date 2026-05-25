import type { McpScope, McpToolDefinition } from "../runtime/types.js";

export function filterByScopes(tools: McpToolDefinition[], allowed: Set<McpScope>): McpToolDefinition[] {
  return tools.filter((t) => t.scopes.every((s) => allowed.has(s)));
}

export function parseScopes(values: string[]): McpScope[] {
  const out: McpScope[] = [];
  for (const v of values) {
    if (v === "read" || v === "write" || v === "destructive") out.push(v);
  }
  return out.length > 0 ? out : ["read", "write", "destructive"];
}
