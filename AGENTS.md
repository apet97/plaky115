# Agent Guide

This repo is the Plaky115 toolkit: an unofficial, hand-crafted TypeScript SDK,
Go CLI, and MCP server for the Plaky public API.

## Scope

- `sdk/` publishes the TypeScript package `plaky115`.
- `cli/` builds the Go/Cobra binary `plaky115`.
- `mcp-server/` publishes the MCP package `plaky115-mcp`.
- Generated schema/raw surfaces come from local scripts and checked-in metadata;
  do not migrate this repo to external API generation vendors.

## License and Affiliation

- The toolkit is unofficial and not affiliated with, endorsed by, or sponsored by
  Plaky or CAKE.com. Keep that notice visible in the root README, each package
  README, the CLI command help (`root.go` `Short`), and the MCP server
  `instructions`.
- Licensed MIT. The repo root and each published package (`sdk/`, `mcp-server/`)
  ship a `LICENSE` allowlisted in their `.npmignore`. After any change to
  published package contents, run `npm run packsnapshot:write` and commit the
  refreshed `<pkg>/.packsnapshot` baselines.

## Toolchain

- SDK and MCP packages require Node.js `>=22.12`.
- CI tests Node `22.12.0`, `24`, and `26`.
- MCP binary builds require Bun `1.2.17`.
- CLI checks use Go `1.26.x`.
- OpenAPI checks use local Ruby scripts; release checks use GoReleaser.

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

For docs-only changes, still run:

```bash
npm run generate:docs-index
npm run docs:surface:test
rg -n "s[p]eakeasy|S[p]eakeasy|x-s[p]eakeasy|\\.s[p]eakeasy" . -g '!**/node_modules/**' -g '!**/.git/**'
```

For live proof, only report secrets as set/unset:

```bash
PLAKY115_API_KEY=... \
PLAKY115_SMOKE_SPACE_ID=... \
PLAKY115_SMOKE_BOARD_ID=... \
npm run live:sweep
```

Acceptance for live proof requires API, SDK, CLI, and MCP sections to run, and
cleanup to scan all item pages and complete with leftover count `0`.

Before any direct push to `main`, verify the worktree is clean, run
`npm run verify`, run `npm run secret:scan`, and run `npm run live:sweep` when
the user explicitly asked for live proof.

## Generated Surface Rules

- `npm run generate:all` regenerates SDK schema types, MCP raw tools, CLI raw
  commands, Go raw helpers, and the MCP docs index.
- Do not hand-edit generated outputs except to inspect drift. Change the
  generator under `scripts/lib/` or the operation metadata instead.
- Raw CLI write commands require an explicit `--body`; raw CLI DELETE commands
  require `--confirm`.
- `scripts/postgen-dx.mjs` owns SDK/MCP package metadata invariants, including
  the explicit SDK runtime export allowlist.
- `npm run generated:drift`, `npm run codegen:test`, and
  `npm run postgen:drift` must stay green.
- `npm run metadata:test` validates the operation metadata: example request/response
  payloads must match the spec shapes (object-map vs array `fields`, uppercase
  field-type enum) and every spec query param must be threaded
  (`THREADED_QUERY_PARAMS`) or explicitly listed in `KNOWN_UNTHREADED_QUERY_PARAMS`.
  All current spec query params are threaded (`KNOWN_UNTHREADED_QUERY_PARAMS` is
  empty). The generator marks array query params with `array`/`explode` so codegen
  emits repeated-key serialization (`emails`) vs comma-joined (`expand`).
- `npm run examples:check` syntax-gates the runnable `examples/` (offline; part of
  `verify`).

## Public Compatibility

Keep these public contracts stable unless the user asks for a breaking change:

- `import { PlakyClient } from "plaky115"`
- `client.requestWithResponse(...)`
- `plaky115/runtime/http.js`
- CLI command names, especially curated commands and `raw` subcommands
- MCP curated tool names and generated raw tool names
- SDK generated API operation modules remain private; the SDK exposes generated
  schema types plus hand-written resource methods.
- The threaded server-side filters reach all three surfaces: `listUsers`
  (`emails`/`status`/`type`) and `listItems`
  (`boardViewId`/`parentId`/`subitemsBehaviour`). Keep them in sync across SDK,
  CLI raw, and MCP raw; the cross-surface parity test exercises them.

`CommentShape` exposes both `content?: string` for API response naming and
`text?: string` for compatibility. Reconcile shapes additively against
`sdk/src/generated/types.ts`; keep non-emitted fields as `@deprecated` optionals.

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
- Redaction is centralized: Go callers use `plakysdk.RedactSecrets`; the SDK uses
  `redact`/`redactRecord`. Do not reintroduce a package-local key regex.
- `npm run secret:scan` is the required final check before push.

## Writing Style

- Keep docs concrete: commands, contracts, behavior, and verification.
- Avoid promotional filler, vague quality claims, and AI-generated-sounding
  adjectives.
- Prefer exact compatibility notes and current release gates over broad claims.
