# Plaky115

[![CI](https://github.com/apet97/plaky115/actions/workflows/ci.yml/badge.svg)](https://github.com/apet97/plaky115/actions/workflows/ci.yml)

Unofficial, hand-crafted developer toolkit for the Plaky public API:

- TypeScript SDK package: `plaky115`
- Go/Cobra CLI: `plaky115`
- MCP server package: `plaky115-mcp`

Plaky115 is not affiliated with Plaky or CAKE.com. It is built to feel like a
polished SDK while preserving a deterministic local generation model: generated
schema/raw surfaces are checked into the repo, and the ergonomic client, CLI,
MCP tools, retry behavior, pagination helpers, and release gates are
hand-written.

## What You Get

- Typed TypeScript client with stable `PlakyClient` resource methods.
- Auto-pagination helpers, `listAll`, and async iterators.
- Conservative retries with backoff and idempotency-aware write retries.
- Typed API errors with status, request ID, retry-after, headers, and body.
- `requestWithResponse()` for raw response metadata and low-level escape hatches.
- Rate-limit snapshots, request/response interceptors, timeouts, abort handling,
  user-agent control, and webhook helpers.
- Go CLI with curated workflows plus generated raw API commands.
- MCP server with curated assistant-friendly tools plus generated raw tools.
- Local release gates for generated drift, package contents, consumer smoke,
  live smoke, secret scanning, and GoReleaser validation.

## Repository Layout

| Path | Purpose |
| --- | --- |
| `sdk/` | TypeScript package `plaky115`; hand-written client plus generated schema types. |
| `cli/` | Go/Cobra CLI `plaky115`; curated commands plus generated raw subtree. |
| `mcp-server/` | TypeScript MCP server `plaky115-mcp`; curated tools plus generated raw tools. |
| `scripts/` | Local codegen, drift checks, package audits, live sweep, and release helpers. |
| `docs/` | Surface, codegen, live-smoke, release, and API-evolution notes. |
| `openapi/` | Overlay-applied OpenAPI document and operation metadata. |

## Requirements

- Node.js `>=22.12` for SDK and MCP package builds.
- Bun `1.2.17` for the MCP executable bundle.
- Go `1.26.x` for the CLI.
- Speakeasy CLI for local OpenAPI overlay/lint checks.
- GoReleaser for CLI release configuration validation.

Set an API key when calling live Plaky endpoints:

```bash
export PLAKY115_API_KEY=...
```

`PLAKY115_API_KEY_AUTH` remains a compatibility fallback. Never commit or print
`plk_` values; `npm run secret:scan` is part of the release gate.

## Install Locally

```bash
npm --prefix sdk ci
npm --prefix mcp-server ci
(cd cli && go mod download)
```

Build the SDK and MCP packages:

```bash
npm --prefix sdk run build
npm --prefix mcp-server run build
```

Build the CLI:

```bash
(cd cli && go build -o /tmp/plaky115 ./cmd/plaky115)
```

## TypeScript SDK

```ts
import { PlakyClient, fieldValues, statusField } from "plaky115";

const plaky = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
});

for await (const space of plaky.spaces.iterate({ pageSize: 100 })) {
  console.log(space.id, space.title);
}

const spaceId = 123;
const boardId = 456;

const items = await plaky.items.listAll({ spaceId, boardId });

await plaky.items.create({
  spaceId,
  boardId,
  body: {
    title: "Ship API wrapper",
    fields: fieldValues({ Status: statusField("Done") }),
  },
});
```

Mutations attach idempotency keys by default. `GET` requests can retry, and write
requests retry only when an idempotency key is present.

Use `requestWithResponse()` when you need status, headers, request IDs, or a raw
API path:

```ts
const response = await plaky.requestWithResponse({
  method: "GET",
  path: "/v1/public/spaces",
});

console.log(response.status, response.requestId, response.data);
```

`CommentShape` exposes both `content` for the API response field and `text` for
caller compatibility.

## CLI

```bash
plaky115 --help
plaky115 doctor

# Curated workflows
plaky115 workspace-map
plaky115 find --type item --space-id 123 --board-id 456 --query "invoice"
plaky115 fields-list --space-id 123 --board-id 456
plaky115 items-export --space-id 123 --board-id 456 --format jsonl
plaky115 items-create-simple --space-id 123 --board-id 456 --title "Follow up" --dry-run
plaky115 comments-add --space-id 123 --board-id 456 --item-id 789 --text "Note" --dry-run
plaky115 items-bulk-update --file updates.json --dry-run

# Generated raw operations
plaky115 raw list-spaces
plaky115 raw get-item --space-id 123 --board-id 456 --item-id 789
plaky115 raw create-item --space-id 123 --board-id 456 --body '{"title":"hi"}'
```

## MCP Server

```json
{
  "mcpServers": {
    "plaky115": {
      "command": "npx",
      "args": ["--yes", "--package", "/absolute/path/to/mcp-server", "--", "mcp", "start"],
      "env": { "PLAKY115_API_KEY": "set-this-in-your-secret-store" }
    }
  }
}
```

Modes:

- `--mode curated` for assistant-friendly workflows.
- `--mode generated` for one raw tool per Plaky operation.
- `--mode all` for both surfaces.

Scopes:

- `--scope read`
- `--scope write`
- `--scope destructive`

Curated tools include `plaky_search_docs`, `plaky_workspace_context`,
`plaky_find`, `plaky_plan_mutation`, and `plaky_execute_workflow`.

See `docs/install-snippets.md` for Claude Desktop, Claude Code, Cursor, and
local CLI examples.

## Quality Gates

Run the release-grade local gate:

```bash
npm run verify
```

It covers overlay validation, OpenAPI linting, metadata tests, deterministic
generation, drift checks, SDK/MCP type/lint/test suites, CLI tests/build/help,
surface status, package artifact audit, pack smoke, consumer smoke, secret scan,
and GoReleaser validation.

Useful focused checks:

```bash
npm run status:surfaces:strict
npm run generated:drift
npm run codegen:test
npm run postgen:drift
npm run package:consumer-smoke
npm run secret:scan
```

## Live Smoke

Only run the live sweep against a sacrificial workspace:

```bash
export PLAKY115_API_KEY=...
export PLAKY115_SMOKE_SPACE_ID=...
export PLAKY115_SMOKE_BOARD_ID=...
npm run live:sweep
```

The sweep exercises API, SDK, CLI, and MCP paths, creates clearly named
`smoke:` items/comments, cleans them up, and requires a successful leftover scan
with count `0`.

## Regenerate

```bash
npm run generate:all
```

This rebuilds SDK schema types, MCP raw tools, CLI raw commands, Go raw helpers,
and the MCP docs index. Change generators under `scripts/lib/` or operation
metadata rather than hand-editing generated outputs.

No Speakeasy cloud generation is involved. Speakeasy is used locally only for
overlay validation and OpenAPI linting.
