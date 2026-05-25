import type { McpToolDefinition } from "../runtime/types.js";
import { rawTools } from "../tools/raw/index.js";
import { curatedTools } from "../tools/curated/index.js";

export type Mode = "curated" | "generated" | "all";

export function selectTools(mode: Mode): McpToolDefinition[] {
  if (mode === "curated") return curatedTools;
  if (mode === "generated") return rawTools;
  return [...curatedTools, ...rawTools];
}

export function parseMode(value: string | undefined): Mode {
  if (value === "curated" || value === "generated" || value === "all") return value;
  return "all";
}
