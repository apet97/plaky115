# ADR: Keep raw schema boundaries narrow

Status: accepted

The raw CLI and MCP generators will continue to use the accepted operation
metadata for parameters, request kind, success kind, scopes, and annotations.
They will not expand every OpenAPI component into a second full runtime type
system.

The focused spike tightened two representative boundaries: OpenAPI `int64`
parameters now preserve canonical decimal strings in MCP, and required JSON
writes reject non-object roots in CLI and MCP. Curated SDK/CLI/MCP paths perform
resource-specific response narrowing where users need stronger guarantees.

This choice keeps generated output small and deterministic, preserves raw escape
hatches and all operation names, and avoids duplicating the generated TypeScript
schema surface in Go and Zod. Revisit only when a concrete operation requires
runtime response validation that curated narrowing cannot provide.
