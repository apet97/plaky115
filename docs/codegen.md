# Codegen

The toolkit uses in-repo deterministic generators. The TypeScript SDK generates
schema types only; the SDK runtime and resource API are hand-written.

All generators read `openapi/plaky115-operation-metadata.json`, which is
Ruby-generated from the overlay. Running `npm run generate:all` twice should
produce zero diff, as checked by `scripts/test-codegen-determinism.mjs`.

## Pipeline

```
api-1.yaml (upstream)
    |
    +-- ruby scripts/apply-overlay.rb  (overlays/plaky115-dx.overlay.yaml)
    v
openapi/plaky115-dx.openapi.yaml
    |
    +-- ruby scripts/generate-operation-metadata.rb
    v
openapi/plaky115-operation-metadata.json
    |
    +-- openapi-typescript      -> sdk/src/generated/types.ts
    +-- generate-mcp.mjs        -> mcp-server/src/tools/raw/*.ts + index.ts
    +-- generate-cli.mjs        -> cli/internal/cli/raw/*.go + raw.go
    |                            -> cli/internal/plakysdk/operations.go
    +-- generate-docs-index.mjs -> mcp-server/src/runtime/docs-index.ts
```

## Scripts

- `scripts/generate-types.mjs` - runs `openapi-typescript` against the dx overlay and prepends an `AUTO-GENERATED` header.
- `scripts/generate-mcp.mjs` - one MCP raw tool definition per operation, scope/annotation-aware. `index.ts` exports `rawTools[]`.
- `scripts/generate-cli.mjs` - one cobra command per operation, one Go method on `*Client` per operation, plus `raw.go` registering them all.
- `scripts/generate-docs-index.mjs` - corpus of operation, workflow, and guide entries consumed by `plaky_search_docs`.
- `scripts/apply-overlay.rb` - applies the DX overlay using Ruby standard library YAML support.
- `scripts/lint-openapi.rb` - validates local OpenAPI files without external CLI dependencies.
- `scripts/generate-all.mjs` - runs overlay apply, lint, OpenAPI tests, metadata generate/test, every codegen step, then `test:surfaces`.

## SDK Resource API

`sdk/src/client/` and `sdk/src/runtime/` are hand-written. They call the Plaky
HTTP API through one transport core that owns:

- API key providers
- custom fetch injection
- custom headers
- retries and `Retry-After`
- timeouts and cancellation
- typed errors
- response metadata through `requestWithResponse()`
- pagination helpers

The low-level SDK escape hatch is:

```ts
const response = await client.requestWithResponse({
  method: "GET",
  path: "/v1/public/spaces",
});
```

## Adding a New Operation

1. Update `api-1.yaml` or the upstream source.
2. Add metadata to `overlays/plaky115-dx.overlay.yaml`: `operationId`, `x-plaky115-mcp` annotations, and `x-plaky115-pagination` metadata if it is a list.
3. Run `npm run overlay:apply` and `npm run lint:openapi`.
4. Run `npm run metadata:generate` and `npm run metadata:test`.
5. Run `npm run generate:all`.
6. Add or update the hand-written SDK resource method in `sdk/src/client/<resource>.ts`.
7. Add a curated CLI command in `cli/internal/cli/dx.go` if it should be user-facing.
8. Add a curated MCP workflow in `mcp-server/src/tools/curated/` if it is agent-useful.
9. Add focused SDK, MCP, and CLI tests for the changed surface.

## Determinism

Every generator is idempotent. CI and local verification enforce this through
`npm run generated:drift` and `npm run codegen:test`.

## Hand-Edited Files

Generated files carry `// AUTO-GENERATED` headers and are recreated on demand.
The hand-written layer is in separate files:

- `sdk/src/client/`
- `sdk/src/runtime/`
- `mcp-server/src/server/`
- `mcp-server/src/tools/curated/`
- `cli/internal/cli/dx.go`
- `cli/internal/plakydx/`
