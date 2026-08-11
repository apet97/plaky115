# API Evolution Playbook

What to do when the Plaky API changes. Normal verification is offline. Network
freshness and local acceptance are separate, explicit operations.

## Official source freshness

Fetch and compare an ignored candidate without changing the tracked contract:

```bash
npm run contract:fetch-candidate
npm run contract:diff-candidate
```

The fetch stores raw source, canonical JSON, deterministic YAML, and bounded
provenance under `.contract-candidate/current/`. The semantic diff emits
pointer-level additive, breaking, transport, documentation, and
`review-required` records; an unknown semantic change is never silently treated
as breaking. The scheduled/manual `OpenAPI freshness` workflow uploads those
ignored files as evidence and fails on drift. It has read-only repository
permissions and never commits, opens a pull request, or accepts a contract.

After reviewing the source hashes, operation inventory, semantic diff, rendered
official documentation, and overlay compatibility, acceptance is local and
manual:

```bash
npm run contract:accept-candidate -- --yes
npm run contract:manifest:check
```

Acceptance validates the selected upstream YAML and its checked-in provenance
manifest, then replaces the pair through a journaled transaction. If a process
stops during acceptance, the journal blocks another acceptance until the exact
old or new pair is recovered:

```bash
npm run contract:accept-candidate -- --recover
```

Do not run acceptance or recovery from the freshness workflow.

## New endpoint added

1. Fetch, review, and explicitly accept the official candidate as described above.
2. Add an action under `overlays/plaky115-dx.overlay.yaml` with `operationId`, `summary`, `x-plaky115-mcp` annotations (scope, idempotent, destructive), and `x-plaky115-pagination` if it returns a list.
3. `npm run overlay:apply && npm run lint:openapi`.
4. `npm run metadata:generate && npm run metadata:test`.
5. `npm run generate:all` — SDK schema types, MCP raw tool, CLI raw command, and docs index update automatically.
6. Add a method on the appropriate resource in `sdk/src/client/<resource>.ts`. For list endpoints, expose `iterate()` and `listAll()` via `paginate()`.
7. If user-facing, add a focused curated CLI module in `cli/internal/cli/`. If agent-useful, add a curated MCP workflow in `mcp-server/src/tools/curated/`.
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

## OpenAPI gate failures

The local overlay and lint scripts are the source of truth for OpenAPI checks:

- Overlay: `ruby scripts/apply-overlay.rb --source api-1.yaml --overlay overlays/plaky115-dx.overlay.yaml --out openapi/plaky115-dx.openapi.yaml`
- Lint: `ruby scripts/lint-openapi.rb api-1.yaml openapi/plaky115-dx.openapi.yaml`

Fix the upstream mirror, overlay action, or local validator test that explains
the failure; no SDK/CLI/MCP code changes are needed unless generated surfaces
or hand-written convenience methods change.
