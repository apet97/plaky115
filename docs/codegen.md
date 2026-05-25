# Codegen

The toolkit replaces Speakeasy cloud generation with in-repo deterministic generators. All generators read `openapi/plaky115-operation-metadata.json` (Ruby-generated from the overlay) and emit idempotent output. Running `npm run generate:all` twice produces zero diff (proven by `scripts/test-codegen-determinism.mjs`).

## Pipeline

```
api-1.yaml (upstream)
    │
    ├── speakeasy overlay apply  (overlays/plaky115-dx.overlay.yaml)
    ▼
openapi/plaky115-dx.openapi.yaml
    │
    ├── ruby scripts/generate-operation-metadata.rb
    ▼
openapi/plaky115-operation-metadata.json
    │
    ├── openapi-typescript        → sdk/src/generated/types.ts
    ├── generate-operations.mjs   → sdk/src/generated/operations/*.ts + operation-table.ts
    ├── generate-mcp.mjs          → mcp-server/src/tools/raw/*.ts + index.ts
    ├── generate-cli.mjs          → cli/internal/cli/raw/*.go + raw.go
    │                             → cli/internal/plakysdk/operations.go
    └── generate-docs-index.mjs   → mcp-server/src/runtime/docs-index.ts
```

## Scripts

- `scripts/generate-types.mjs` — runs `openapi-typescript` against the dx overlay, prepends an `AUTO-GENERATED` header.
- `scripts/generate-operations.mjs` — one TS module per operation. Each exports `<op>Params`, `<op>Response`, and `<op>(params, options)`.
- `scripts/generate-mcp.mjs` — one MCP tool definition per operation, scope/annotation-aware. `index.ts` exports `rawTools[]`.
- `scripts/generate-cli.mjs` — one cobra command per operation (`cli/internal/cli/raw/*.go`), one Go method on `*Client` per operation (`cli/internal/plakysdk/operations.go`), plus `raw.go` registering them all.
- `scripts/generate-docs-index.mjs` — corpus of operation + workflow + guide entries consumed by `plaky_search_docs`.
- `scripts/generate-all.mjs` — runs overlay apply, lint, metadata generate+test, every codegen step, then `test:surfaces`.

## Adding a new operation

1. Update `api-1.yaml` (or upstream).
2. Add metadata to `overlays/plaky115-dx.overlay.yaml` — `operationId`, `x-speakeasy-mcp`, `x-speakeasy-pagination` if a list.
3. Run `npm run overlay:apply && npm run lint:openapi`.
4. Run `npm run metadata:generate && npm run metadata:test`.
5. Run `npm run generate:all` — types, operation modules, MCP raw tool, CLI raw command, docs index updated automatically.
6. Add a hand-crafted method on the appropriate resource in `sdk/src/client/<resource>.ts`.
7. Add a curated CLI command in `cli/internal/cli/dx.go` (if user-facing) and a curated MCP workflow in `mcp-server/src/tools/curated/` (if agent-useful).
8. Tests: SDK unit (mock fetch), MCP scope/mode, CLI dry-run.

## Determinism

Every generator is idempotent: re-running `generate:all` on a clean tree produces zero diff. CI enforces this with `git diff --exit-code` after `generate:all`.

## What was hand-edited from generated files

Nothing. Generated files carry `// AUTO-GENERATED` headers and are recreated on demand. The hand-crafted layer is in separate files (`sdk/src/client/`, `sdk/src/runtime/`, `mcp-server/src/server/`, `mcp-server/src/tools/curated/`, `cli/internal/cli/dx.go`, `cli/internal/plakydx/`).
