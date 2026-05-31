# Plaky115

[![CI](https://github.com/apet97/plaky115/actions/workflows/ci.yml/badge.svg)](https://github.com/apet97/plaky115/actions/workflows/ci.yml)

Unofficial, hand-crafted developer toolkit for the Plaky public API:

- TypeScript SDK package: `plaky115`
- Go/Cobra CLI: `plaky115`
- MCP server package: `plaky115-mcp`

Plaky115 is not affiliated with Plaky or CAKE.com. The repo keeps generated
code narrow and reviewable: OpenAPI schema types, raw CLI commands, raw MCP
tools, and metadata indexes are generated locally and checked in. The SDK
client, runtime behavior, curated CLI commands, curated MCP tools, retry logic,
pagination, and release gates are hand-written.

## What It Ships

- TypeScript SDK with stable `PlakyClient` resource methods.
- Generated OpenAPI schema types exported as type-only escape hatches.
- Pagination helpers: page APIs, `listAll`, and async iterators.
- Runtime controls: retries, idempotency keys, timeouts, abort signals,
  interceptors, custom fetch, custom headers, user-agent control, rate-limit
  snapshots, and webhook signature helpers.
- Typed API errors with status, request ID, retry-after, headers, and response
  body.
- `requestWithResponse()` for status, headers, request IDs, and raw API paths.
- Go CLI with curated workflows, generated raw API commands, idempotency flags,
  file/stdin JSON bodies, and dry-run helpers.
- MCP server with curated workflows, generated raw tools, `structuredContent`,
  conservative `outputSchema` values, and structured tool errors.
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
- Ruby for local OpenAPI overlay, lint, and metadata checks.
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
plaky115 comments-thread --space-id 123 --board-id 456 --item-id 789
plaky115 reactions-replace --space-id 123 --board-id 456 --item-id 789 --comment-id 321 --body '{"emojis":["thumbsup"]}' --dry-run
plaky115 items-bulk-update --file updates.json --dry-run

# Generated raw operations
plaky115 raw list-spaces
plaky115 raw get-item --space-id 123 --board-id 456 --item-id 789
plaky115 raw create-item --space-id 123 --board-id 456 --idempotency-key import-123 --body '{"title":"hi"}'
plaky115 raw update-item-fields --space-id 123 --board-id 456 --item-id 789 --body @payload.json
printf '{"title":"stdin"}' | plaky115 raw create-item --space-id 123 --board-id 456 --body @-
plaky115 raw delete-item --space-id 123 --board-id 456 --item-id 789 --confirm
```

Raw write commands require `--body`; they do not send implicit empty JSON. Raw
DELETE commands require `--confirm`.

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

Curated tools:

- `plaky_search_docs`
- `plaky_workspace_context`
- `plaky_find`
- `plaky_plan_mutation`
- `plaky_execute_workflow`

Tool results include redacted JSON text for readability and the same object in
`structuredContent` for clients. Known Plaky API failures return `isError: true`
with structured error details instead of crashing the tool call.

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
across all item pages with count `0`.

## Regenerate

```bash
npm run generate:all
```

This rebuilds SDK schema types, MCP raw tools, CLI raw commands, Go raw helpers,
and the MCP docs index. Change generators under `scripts/lib/` or operation
metadata rather than hand-editing generated outputs.

No cloud API generation is involved. OpenAPI overlay validation and linting run
through repo-local Ruby scripts.
