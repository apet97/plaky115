# Agent Guide

This repo is the Plaky115 toolkit: an unofficial, hand-crafted TypeScript SDK,
Go CLI, and MCP server for the Plaky public API.

## Scope

- `sdk/` publishes the TypeScript package `plaky115`.
- `cli/` builds the Go/Cobra binary `plaky115`.
- `mcp-server/` publishes the MCP package `plaky115-mcp`.
- Generated schema/raw surfaces come from local scripts and checked-in metadata;
  do not migrate this repo to Stainless, Speakeasy, or Fern generation.

## Toolchain

- SDK and MCP packages require Node.js `>=22.12`.
- CI tests Node `22.12.0`, `24`, and `26`.
- MCP binary builds require Bun `1.2.17`.
- CLI checks use Go `1.26.x`.
- OpenAPI checks use the Speakeasy CLI; release checks use GoReleaser.

## Setup

```bash
npm --prefix sdk ci
npm --prefix mcp-server ci
(cd cli && go mod download)
```

## Verification

Use release-grade gates after behavior, generated surfaces, docs, package
exports, or workflow files change:

```bash
npm run status:surfaces:strict
npm run verify
(cd sdk && npm pack --dry-run --json)
(cd mcp-server && npm pack --dry-run --json)
npm run package:consumer-smoke
npm run secret:scan
```

For live proof, only report secrets as set/unset:

```bash
PLAKY115_API_KEY=... \
PLAKY115_SMOKE_SPACE_ID=... \
PLAKY115_SMOKE_BOARD_ID=... \
npm run live:sweep
```

Acceptance for live proof requires API, SDK, CLI, and MCP sections to run, and
cleanup to complete with leftover count `0`.

## Generated Surface Rules

- `npm run generate:all` regenerates SDK schema types, MCP raw tools, CLI raw
  commands, Go raw helpers, and the MCP docs index.
- Do not hand-edit generated outputs except to inspect drift. Change the
  generator under `scripts/lib/` or the operation metadata instead.
- `scripts/postgen-dx.mjs` owns SDK/MCP package metadata invariants, including
  the explicit SDK runtime export allowlist.
- `npm run generated:drift`, `npm run codegen:test`, and
  `npm run postgen:drift` must stay green.

## Public Compatibility

Keep these public contracts stable unless the user asks for a breaking change:

- `import { PlakyClient } from "plaky115"`
- `client.requestWithResponse(...)`
- `plaky115/runtime/http.js`
- CLI command names, especially curated commands and `raw` subcommands
- MCP curated tool names and generated raw tool names
- SDK generated API operation modules remain private; the SDK exposes generated
  schema types plus hand-written resource methods.

`CommentShape` exposes both `content?: string` for API response naming and
`text?: string` for compatibility.

## SDK Runtime Boundaries

- Public transport remains `sdk/src/runtime/http.ts`.
- Transport helper internals live under `sdk/src/runtime/internal/`.
- Internal runtime modules must not be exported from `sdk/package.json`.
- The package consumer smoke test asserts failed imports for internal/generated
  operation paths.

## Secrets

- Never commit API keys or `plk_` values.
- Never print live keys in logs, screenshots, docs, notes, or command output.
- Use environment variables or the local secret store only.
- `npm run secret:scan` is the required final check before push.
