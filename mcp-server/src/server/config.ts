/** Resolve the MCP API origin without silently ignoring explicit configuration. */
export function resolveServerURL(
  explicitServerURL: string | undefined,
  environment: Record<string, string | undefined> = process.env,
): string | undefined {
  return explicitServerURL !== undefined ? explicitServerURL : environment["PLAKY115_BASE_URL"];
}
