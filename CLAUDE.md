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
npm run metadata:test   # also validates example payloads + spec query-param coverage
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

Raw generated write commands fail without `--body`; raw generated DELETE
commands fail without `--confirm`.

Before release or direct push:

```bash
npm run verify
npm run secret:scan
```

For docs updates, refresh generated docs and check for stale language:

```bash
npm run generate:docs-index
npm run docs:surface:test
npm run examples:check   # node --check the SDK examples + bash -n the CLI recipe
rg -n "s[p]eakeasy|S[p]eakeasy|x-s[p]eakeasy|\\.s[p]eakeasy" . -g '!**/node_modules/**' -g '!**/.git/**'
```

## Live Sweep

Use `npm run live:sweep` only when the user has requested live proof or explicitly
allowed sacrificial Plaky data. The live gate expects these environment variables:

- `PLAKY115_API_KEY`
- `PLAKY115_SMOKE_SPACE_ID`
- `PLAKY115_SMOKE_BOARD_ID`

Do not echo their values. A successful live sweep must run API, SDK, CLI, and MCP
sections and finish with cleanup scanning all item pages and leftover count `0`.

## Documentation Style

- Use direct, specific language.
- Avoid promotional phrasing and generic AI-sounding claims.
- Keep README examples runnable and aligned with current SDK, CLI, and MCP
  behavior.

## Current Compatibility Notes

- Node floor for SDK and MCP packages is `>=22.12`.
- CI covers Node `22.12.0`, `24`, and `26`.
- `CommentShape` intentionally includes both `content?: string` and
  `text?: string`. Shapes mirror `sdk/src/generated/types.ts`; fields the API
  does not emit are kept as `@deprecated` optionals, not removed.
- `ItemExpand` is exactly the seven values the API accepts; passing others
  (`subitems`, `subscribedUsers`, `subscribedTeams`) returns HTTP 400. A type
  test pins `ItemExpand` to the generated `listItems` expand enum.
- `comments.list` normalizes the non-paginated bare-array `listItemComments`
  response into a `PagedResult` page, so `iterate`/`listAll` return comments.
- The `listUsers` (`emails`/`status`/`type`) and `listItems`
  (`boardViewId`/`parentId`/`subitemsBehaviour`) server-side filters are threaded
  through the SDK, CLI raw, and MCP raw surfaces (`emails` as repeated keys).
- `exportItems` / CLI `items-export` CSV expands `item.fields[]` into per-field
  columns; the SDK and Go CLI emit byte-identical CSV for scalar field values
  (a non-scalar value is JSON-encoded and may differ in object-key order). The
  `searchItems` return type is `ItemShape[]` (refined from the older
  `{id,title}` shape; richer and assignable to it).
- Additive public exports: `asFieldKey`, `ItemFieldValueBody`,
  `resolveSpaceAndBoard`, `PlakyDecodeError` (decode failures on a 2xx are not
  retried and not mislabeled as connection errors).
- The CLI reports `--version` (GoReleaser injects `main.version`/`main.buildTime`)
  and sends a versioned `User-Agent`.
- SDK runtime internals are intentionally private package subpaths.
- The toolkit is unofficial and not affiliated with Plaky/CAKE.com; keep that
  notice prominent in the README, sub-package READMEs, CLI help, and the MCP
  server `instructions`.
- MIT-licensed: the repo root and each published package (`sdk/`, `mcp-server/`)
  ship a `LICENSE` allowlisted in `.npmignore`. Run `npm run packsnapshot:write`
  after any change to published package contents.
