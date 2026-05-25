# API Evolution Playbook

What to do when the Plaky API changes. Replaces the v1 plan's "wait for Speakeasy unblock" with a concrete, repeatable flow.

## New endpoint added

1. Update `api-1.yaml` (upstream mirror).
2. Add an action under `overlays/plaky115-dx.overlay.yaml` with `operationId`, `summary`, `x-speakeasy-mcp` annotations (scope, idempotent, destructive), and `x-speakeasy-pagination` if it returns a list.
3. `npm run overlay:apply && npm run lint:openapi`.
4. `npm run metadata:generate && npm run metadata:test`.
5. `npm run generate:all` — SDK schema types, MCP raw tool, CLI raw command, and docs index update automatically.
6. Add a method on the appropriate resource in `sdk/src/client/<resource>.ts`. For list endpoints, expose `iterate()` and `listAll()` via `paginate()`.
7. If user-facing, add a curated CLI command in `cli/internal/cli/dx.go`. If agent-useful, add a curated MCP workflow in `mcp-server/src/tools/curated/`.
8. Tests: SDK unit (mock fetch), MCP scope/mode coverage, CLI dry-run. Add a live-sweep entry when wiring opt-in coverage.
9. Run the local gates (`npm run test:surfaces && npm --prefix sdk test && npm --prefix mcp-server test && (cd cli && go test ./...)`).

## Schema change to an existing endpoint

1. Update upstream or overlay.
2. `npm run generate:all`.
3. `git diff sdk/src/generated/types.ts` — review the generated schema type diff.
4. If the change breaks a hand-crafted client method, update it.
5. Add a test for the new behavior.

## Endpoint deprecated

1. Mark with `deprecated: true` in the overlay action.
2. Add a `@deprecated` JSDoc tag to the corresponding SDK resource method.
3. Schedule removal one minor version later.

## Pagination shape change

If Plaky introduces cursor-based pagination on top of `page/pageSize`, update:
- `openapi/plaky115-operation-metadata.json` `pagination` block (via overlay).
- `scripts/lib/codegen-common.mjs`, `scripts/lib/codegen-mcp.mjs`, and `scripts/lib/codegen-cli.mjs` to emit cursor params for raw MCP and CLI surfaces.
- `sdk/src/runtime/pagination.ts` `paginate()` to thread cursors.

## Speakeasy CLI unavailable

Only `speakeasy overlay {validate,apply,compare}` and `speakeasy lint openapi` are used here. If those become unavailable:
- Overlay: switch to `@redocly/cli` or `openapi-overlay` (npm).
- Lint: switch to `@redocly/cli lint` or `spectral`.

Update `package.json` scripts; no SDK/CLI/MCP code changes needed.
