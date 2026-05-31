# plaky115-mcp

Unofficial local MCP server for the Plaky public API. It ships a small curated
tool surface for agents plus optional raw tools for one-to-one API operations.

## Run

```bash
export PLAKY115_API_KEY=...
npx --yes --package . -- mcp start
```

Requires Node.js `>=22.12`.

Use `--mode curated`, `--mode generated`, or `--mode all` to choose the tool
surface. Use repeated `--scope read`, `--scope write`, or `--scope destructive`
flags when a client should mount only part of the behavior surface. When no
scope is supplied, all scopes are enabled.

## Curated Tools

- `plaky_search_docs`
- `plaky_workspace_context`
- `plaky_find`
- `plaky_plan_mutation`
- `plaky_execute_workflow`

Curated responses are compact by default. Pass `includeRaw: true` when a client
needs the original Plaky API payload.

## Raw Tools

Raw tools are available in `generated` and `all` modes. They are named from the
operation metadata and keep the API-shaped request payloads. Prefer curated
tools for discovery, planning, and agent workflows; use raw tools for exact API
coverage.
