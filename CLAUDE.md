# Claude Project Context

Read `AGENTS.md` first. It owns the shared architecture, public compatibility,
verification, live-proof, release, and secret-handling contract. This file adds
only Claude-specific orientation and current non-obvious behavior.

## Fast orientation

```bash
git status --short --branch
npm run status:surfaces:strict
node -e 'const p=require("./package.json"); console.log(p.scripts)'
```

Key paths:

- `sdk/src/client/` — hand-written SDK resources and public shapes.
- `sdk/src/runtime/http.ts` — public transport seam.
- `sdk/src/runtime/internal/` — private transport helpers.
- `cli/internal/cli/` — curated CLI; `cli/internal/cli/raw/` is generated.
- `cli/internal/plakysdk/operations.go` — generated Go operations.
- `mcp-server/src/tools/curated/` — hand-written agent workflows.
- `mcp-server/src/tools/raw/` — generated operation tools.
- `scripts/lib/` — generator ownership.
- `scripts/lib/codegen-common.mjs` — normalized operation facts shared by the
  CLI and MCP generators.
- `openapi/plaky115-operation-metadata.json` — generated operation semantics.

## Choose the smallest gate

```bash
# Docs
npm run generate:docs-index && npm run docs:surface:test && npm run examples:check

# SDK
npm --prefix sdk run typecheck && npm --prefix sdk run test:types && npm --prefix sdk test

# MCP
npm --prefix mcp-server run lint && npm --prefix mcp-server test

# CLI
(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)

# Generated/contract surfaces
npm run generate:all && npm run generated:drift && npm run codegen:test

# Release candidate
npm run audit:all && npm run govulncheck && npm run verify

# GET-only live contract (rotated key, secure environment injection)
npm --prefix sdk run build && npm run live:read
```

Do not “fix” generated output directly. Find the owning metadata or generator,
change it, regenerate, and review the complete drift.

## Working-tree and documentation hygiene

- Preserve the current dirty work. Limit audits to tracked files with
  `git ls-files` and `git grep`; do not inspect or change ignored taskbooks,
  plans, `.env` files, build outputs, or execution ledgers.
- The focused hygiene gate is:
  `npm run docs:surface:test && npm run examples:check && npm run artifacts:audit && git diff --check`.
- `npm run audit:production` covers shipped runtime dependencies. A full
  `npm --prefix sdk audit` can additionally report development-only generator
  and test tooling; keep that distinction explicit in maintenance reports.

## Current behavior worth preserving

- The accepted contract contains exactly 32 operations.
- SDK generated API material is schema-types-only; resources are hand-written.
- Only `GET` requests retry. Writes are single-attempt even with an explicit
  idempotency key, and the SDK never generates one.
- `ItemExpand` is the exact generated `listItems` enum; undocumented values
  return HTTP 400.
- `comments.list` normalizes the API's bare array into a `PagedResult` so
  `iterate` and `listAll` remain useful.
- Item-file listing stays a bare array in SDK/CLI and a documented `data`
  envelope at the MCP boundary.
- MCP defaults are `--mode curated --scope read`; invalid flags fail closed.
- MCP uploads take `fileBase64`/filename/media type, with a 10 MiB default and
  25 MiB hard limit. They never accept arbitrary filesystem paths.
- `searchItemsDetailed` exposes scan/truncation metadata; deprecated
  `searchItems` remains the array-returning compatibility wrapper.
- SDK and Go CSV exports are deterministic and spreadsheet-safe by default.
- `CommentShape` intentionally includes both `content` and `text`.
- Dynamic user/item filters are threaded across SDK, CLI raw, and MCP raw and
  are guarded by cross-surface parity tests.
- All path IDs are canonical non-negative signed-int64 decimals and fail before
  network access. Unsafe JSON integers decode as exact decimal strings.
- SDK runtime internals and generated operation paths are intentionally private.
- Remote HTTP is rejected except literal loopback; SDK/Go credential requests
  do not follow redirects; buffered responses default to 16 MiB with a 64 MiB
  hard ceiling.
- MCP mutation plans resolve titles to exact IDs. Conflicting compatibility
  aliases fail before network access; file plans never echo base64.
- CLI credentials prefer the environment or `--api-key-stdin`; `--api-key` is
  deprecated and must never be copied into examples.

## Live and release work

`npm run live:read` is GET-only. `npm run live:sweep` requires separate
sacrificial mutation authorization, `PLAKY115_SMOKE_ALLOW_ARCHIVE=1`, all four
surfaces passing, and zero discovered/leftover/tracked artifacts. Credentials
belong only in secure environment injection, never command text or files.
GET-only acceptance requires all 17 reads on both surfaces; only the paired
item-file prerequisite skips are valid. Direct live adapters use the shared
bounded/exact JSON reader, and cleanup pagination must remain capped.

Before a release, verify the GitHub environments and both npm trust relationships
outside the repository. Never create a tag until versions are absent and all
gates are green. After publication, run `scripts/verify-npm-attestation.mjs`
against the peeled tag commit; static workflow correctness is not provenance.
The verifier binds the exact registry digest and repository/tag dependency URI
to that commit.

## Public documentation

This is a public repository. Keep docs user-, contributor-, security-, or
maintainer-facing. Do not commit execution ledgers, taskbooks, agent plans,
credentials, realistic workspace data, or claims unsupported by a current test
or live receipt.
