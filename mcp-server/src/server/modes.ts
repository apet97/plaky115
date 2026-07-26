import type { McpToolDefinition } from "../runtime/types.js";
import { rawTools } from "../tools/raw/index.js";
import { curatedTools } from "../tools/curated/index.js";

export type Mode = "curated" | "generated" | "all";

export class UsageError extends Error {
  readonly exitCode = 2;

  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

export function selectTools(mode: Mode): McpToolDefinition[] {
  if (mode === "curated") return curatedTools;
  if (mode === "generated") return rawTools;
  return [...curatedTools, ...rawTools];
}

export function parseMode(value: string | undefined): Mode {
  if (value === undefined) return "curated";
  if (value === "curated" || value === "generated" || value === "all") return value;
  throw new UsageError(`Invalid mode ${JSON.stringify(value)}; expected curated, generated, or all.`);
}
