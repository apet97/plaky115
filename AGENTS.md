# Agent Guide

Plaky115 is an unofficial, hand-crafted TypeScript SDK, Go CLI, and MCP server
for the Plaky public API. This file is the shared engineering contract for any
agent editing the repository.

## Published surfaces

- `sdk/` publishes the npm package `plaky115`.
- `cli/` builds the Go/Cobra binary `plaky115`.
- `mcp-server/` publishes the npm package `plaky115-mcp`.
- `api-1.yaml`, `overlays/`, and operation metadata own the contract.
- `scripts/lib/` owns generated TypeScript, Go, CLI, MCP, and docs-index output.

Do not migrate the repository to an external generation vendor. Preserve these
public contracts unless a breaking change is explicitly requested:

- `import { PlakyClient } from "plaky115"`
- `client.requestWithResponse(...)`
- `plaky115/runtime/http.js`
- existing CLI command and MCP tool names
- schema-types-only generated SDK output; resource methods remain hand-written

## Toolchain and setup

- Node.js `>=22.12`; CI tests `22.12.0`, `24`, and `26`.
- Bun `1.2.17` from `mcp-server/node_modules/.bin/bun`.
- Go `1.26.x`, Ruby `3.3`, and GoReleaser.

```bash
npm --prefix sdk ci
npm --prefix mcp-server ci
(cd cli && go mod download)
```

## Source ownership

- Never hand-edit files with an `AUTO-GENERATED` header.
- Change generators or metadata, then run `npm run generate:all`.
- `scripts/postgen-dx.mjs` owns package metadata and SDK runtime exports.
- SDK transport is public at `sdk/src/runtime/http.ts`; helpers under
  `sdk/src/runtime/internal/` remain private package paths.
- Raw CLI writes require `--body`; raw deletes require `--confirm`.
- MCP upload accepts base64 plus filename/media type, never a local path.
- Every spec query parameter must be threaded or explicitly classified by the
  metadata tests. Array serialization follows OpenAPI `explode` metadata.

## Verification by change type

Focused SDK:

```bash
npm --prefix sdk run typecheck
npm --prefix sdk run test:types
npm --prefix sdk test
```

Focused MCP and CLI:

```bash
npm --prefix mcp-server run lint
npm --prefix mcp-server test
(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)
```

Generated or contract changes:

```bash
npm run generate:all
npm run generated:drift
npm run codegen:test
npm run postgen:drift
npm run status:surfaces:strict
```

Documentation changes:

```bash
npm run generate:docs-index
npm run docs:surface:test
npm run examples:check
rg -n "s[p]eakeasy|S[p]eakeasy|x-s[p]eakeasy|\\.s[p]eakeasy" . -g '!**/node_modules/**' -g '!**/.git/**'
```

If published package contents change, run `npm run packsnapshot:write` and
commit both package snapshot baselines.

Release-grade gate:

```bash
npm run verify
(cd sdk && npm pack --dry-run --json)
(cd mcp-server && npm pack --dry-run --json)
npm run package:consumer-smoke
npm run secret:scan
```

## Live proof

Run only with explicit permission for sacrificial data:

```bash
PLAKY115_API_KEY=... \
PLAKY115_SMOKE_SPACE_ID=... \
PLAKY115_SMOKE_BOARD_ID=... \
PLAKY115_SMOKE_ALLOW_ARCHIVE=1 \
npm run live:sweep
```

Never print environment values. Acceptance requires API, SDK, CLI, and MCP
sections to pass and final cleanup to report zero discovered, leftover, and
tracked artifacts. One run-scoped exact-ID mutation budget spans surface probes
and cleanup; never retry an ambiguous write or broaden cleanup to a generic
prefix.

## Release contract

Before pushing `main` or a release tag:

1. Commit all intended changes and require clean status.
2. Run the complete release-grade gate and `npm run secret:scan`.
3. Run live proof when the release scope or user requires it.
4. Verify exact package versions are absent from npm.
5. Verify GitHub environment `npm-release` and both npm trusted publishers use
   repository `apet97/plaky115`, workflow `release-npm.yml`, environment
   `npm-release`, and allowed action `npm publish`.

The tag workflows publish npm with OIDC/provenance and build CLI archives with
GoReleaser. Never use a long-lived publish token, reuse a failed tag, move a
public tag, or claim release success before registry and GitHub artifact checks.

## Compatibility notes

- Only `GET` requests retry; writes remain single-attempt with or without an
  explicit idempotency key.
- `CommentShape` exposes API `content?: string` and compatibility `text?: string`.
- `listUsers` filters and `listItems` filters must stay in parity across SDK,
  CLI raw, and MCP raw.
- SDK runtime internals and generated operation paths must remain unexported.
- Signed download URLs are bearer capabilities: return only when requested and
  never log, persist, follow, or include them in summaries.

## Security, license, and writing

- Never commit or print API keys, npm credentials, OTPs, or signed URLs.
- Redaction is centralized in SDK `redact`/`redactRecord` and Go
  `plakysdk.RedactSecrets`; do not add package-local key regexes.
- Keep the unofficial/non-affiliation notice in root/package READMEs, CLI help,
  and MCP instructions.
- Root and npm packages ship the MIT `LICENSE`.
- Write concrete commands and behavior. Avoid promotional filler, vague quality
  claims, internal task history, and duplicated documentation.
