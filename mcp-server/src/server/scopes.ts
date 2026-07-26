import type { McpScope, McpToolDefinition } from "../runtime/types.js";
import { UsageError } from "./modes.js";

export function filterByScopes(tools: McpToolDefinition[], allowed: Set<McpScope>): McpToolDefinition[] {
  return tools.filter((t) => t.scopes.every((s) => allowed.has(s)));
}

export function parseScopes(values: string[]): McpScope[] {
  const out: McpScope[] = [];
  const seen = new Set<McpScope>();
  for (const v of values) {
    if (v !== "read" && v !== "write" && v !== "destructive") {
      throw new UsageError(`Invalid scope ${JSON.stringify(v)}; expected read, write, or destructive.`);
    }
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out.length > 0 ? out : ["read"];
}
