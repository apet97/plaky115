// Single source of truth for which sdk/src/runtime/ modules are public.
// Consumed by scripts/postgen-dx.mjs (builds sdk/package.json's `exports`
// map from this list) and scripts/audit-package-artifacts.mjs (checks that
// every runtime module is either on this list or explicitly named as
// intentionally private). Kept as a plain data constant with zero
// side effects so both scripts can import it directly.
export const publicRuntimeModules = [
  "errors",
  "chunks",
  "http",
  "idempotency",
  "ids",
  "interceptors",
  "pagination",
  "rate-limit",
  "redact",
  "retries",
  "types",
  "user-agent",
];
