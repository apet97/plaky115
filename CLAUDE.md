# Claude Project Context

Read `AGENTS.md` first. It is the shared agent contract for commands, generated
surface rules, public compatibility, live proof, and secret handling.

## What Matters Most

- This is a hand-crafted SDK/CLI/MCP toolkit for the Plaky public API.
- Keep public imports and tool names stable.
- Keep generated raw surfaces deterministic and drift-checked.
- Keep the TypeScript SDK schema-types-only for generated API material; resource
  methods and runtime behavior are hand-written.
- Do not print or persist API key values.

## Fast Orientation

```bash
git status --short --branch
npm run status:surfaces:strict
npm run verify
```

Important directories:

- `sdk/src/client/` - hand-written SDK resources and public shapes.
- `sdk/src/runtime/http.ts` - public SDK transport.
- `sdk/src/runtime/internal/` - private transport helpers.
- `cli/internal/cli/` - curated CLI commands and tests.
- `cli/internal/plakysdk/operations.go` - generated raw Go helpers.
- `mcp-server/src/tools/curated/` - curated MCP tools.
- `mcp-server/src/tools/raw/` - generated MCP raw tools.
- `scripts/lib/` - generators for generated surfaces.

## Common Tasks

After codegen-related changes:

```bash
npm run generate:all
npm run generated:drift
npm run codegen:test
npm run postgen:drift
```

After SDK public-surface changes:

```bash
npm --prefix sdk run typecheck
npm --prefix sdk run test:types
npm --prefix sdk test
npm run package:consumer-smoke
```

After MCP changes:

```bash
npm --prefix mcp-server run lint
npm --prefix mcp-server test
```

After CLI changes:

```bash
(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)
```

Before release or direct push:

```bash
npm run verify
npm run secret:scan
```

## Live Sweep

Use `npm run live:sweep` only when the user has requested live proof or explicitly
allowed sacrificial Plaky data. The live gate expects these environment variables:

- `PLAKY115_API_KEY`
- `PLAKY115_SMOKE_SPACE_ID`
- `PLAKY115_SMOKE_BOARD_ID`

Do not echo their values. A successful live sweep must run API, SDK, CLI, and MCP
sections and finish with cleanup leftover count `0`.

## Current Compatibility Notes

- Node floor for SDK and MCP packages is `>=22.12`.
- CI covers Node `22.12.0`, `24`, and `26`.
- `CommentShape` intentionally includes both `content?: string` and
  `text?: string`.
- SDK runtime internals are intentionally private package subpaths.
