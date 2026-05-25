# Plaky115 Toolkit

Unofficial, hand-crafted SDK / CLI / MCP server for the Plaky public API. Not affiliated with Plaky or CAKE.com.

## Artifacts

- `sdk/` - TypeScript package `plaky115` (hand-crafted client, generated types).
- `cli/` - Go/Cobra CLI `plaky115` (hand-crafted Go SDK plus generated raw subtree).
- `mcp-server/` - TypeScript MCP server `plaky115-mcp` (hand-crafted server plus curated tools and generated raw tools).

## Architecture

1. Generated schema types: `sdk/src/generated/types.ts` from `openapi-typescript`.
2. Generated raw surfaces: CLI raw commands, Go raw helpers, MCP raw tools, and the MCP docs index are scaffolded by local Node scripts from `openapi/plaky115-operation-metadata.json`.
3. Hand-crafted surfaces: `PlakyClient`, curated Go commands, and curated MCP tools. This layer owns pagination helpers, retries, timeouts, cancellation, idempotency keys, typed errors, rate-limit snapshots, interceptors, webhook helpers, mutation planning, and workflow composition.

See `docs/surfaces.md`, `docs/codegen.md`, `docs/api-evolution.md`, and `docs/release-checklist.md`.

## Environment

- `PLAKY115_API_KEY` is preferred.
- `PLAKY115_API_KEY_AUTH` remains a compatibility fallback.
- Never commit a `plk_` value. `npm run secret:scan` enforces this.

## TypeScript SDK

```ts
import { PlakyClient, fieldValues, statusField } from "plaky115";

const plaky = new PlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });

for await (const space of plaky.spaces.iterate({ pageSize: 100 })) {
  console.log(space);
}

const spaceId = 123;
const boardId = 456;
const items = await plaky.items.listAll({ spaceId, boardId });

await plaky.items.create({
  spaceId,
  boardId,
  body: { title: "Ship API wrapper", fields: fieldValues({ Status: statusField("Done") }) },
});

const plan = await plaky.items.create({ spaceId, boardId, body: { title: "x" }, dryRun: true });
// plan = { dryRun: true, operation: "createItem", payload: {...} }
```

Mutations attach idempotency keys by default. Retries are conservative: `GET`
requests can retry, and write requests retry only when an idempotency key is
present.

The low-level TypeScript escape hatch is still the SDK transport, not generated
operation modules:

```ts
const response = await plaky.requestWithResponse({
  method: "GET",
  path: "/v1/public/spaces",
});
```

## CLI

```bash
plaky115 --help
plaky115 doctor

# Curated commands
plaky115 workspace-map
plaky115 find --type item --space-id 123 --board-id 456 --query "invoice"
plaky115 fields-list --space-id 123 --board-id 456
plaky115 items-export --space-id 123 --board-id 456 --format jsonl
plaky115 items-create-simple --space-id 123 --board-id 456 --title "Follow up" --dry-run
plaky115 comments-add --space-id 123 --board-id 456 --item-id 789 --text "Note" --dry-run
plaky115 items-bulk-update --file updates.json --dry-run

# Raw API operations
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
      "args": ["--yes", "--package", "/absolute/path/to/mcp-server", "--", "mcp"],
      "env": { "PLAKY115_API_KEY": "..." }
    }
  }
}
```

Modes: `--mode curated|generated|all` (default `all`). Scopes:
`--scope read|write|destructive` (default all three). Curated tools:
`plaky_search_docs`, `plaky_workspace_context`, `plaky_find`,
`plaky_plan_mutation`, and `plaky_execute_workflow`. Raw mode exposes one tool
per Plaky operation.

See `docs/install-snippets.md` for Claude Desktop, Claude Code, Cursor, and local CLI examples.

## Local Gates

```bash
npm run verify
npm run pack:smoke
npm run secret:scan
(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)
```

## Regenerate

`npm run generate:all` rebuilds SDK schema types, MCP raw tools, CLI raw
commands, and the MCP docs index. `npm run status:surfaces:strict` fails if any
generated surface is stale or legacy.

No Speakeasy cloud generation is involved. Speakeasy is used locally only for
overlay validation and OpenAPI linting.
