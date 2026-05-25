// Placeholder progress hook. Real progress notifications come from the
// MCP server's transport layer; this module provides a stable surface for
// curated tools to call without depending on the transport directly.

export type ProgressFn = (message: string, percent?: number) => void;

export function noopProgress(): ProgressFn {
  return () => {
    /* no-op */
  };
}
