# Plaky115 Toolkit

Unofficial, hand-crafted SDK / CLI / MCP server for the Plaky public API. Not affiliated with Plaky or CAKE.com.

## Artifacts

- `sdk/` — TypeScript package `plaky115` (hand-crafted client, generated types).
- `cli/` — Go/Cobra CLI `plaky115` (hand-crafted Go SDK + generated raw subtree).
- `mcp-server/` — TypeScript MCP server `plaky115-mcp` (hand-crafted server + curated tools + generated raw tools).

## Architecture (3 layers)

1. **Generated types** — `sdk/src/generated/types.ts` from `openapi-typescript`.
2. **Generated low-level operations** — one module per OpenAPI operation, scaffolded by in-repo Node scripts (`scripts/generate-*.mjs`) from `openapi/plaky115-operation-metadata.json`. Deterministic, idempotent.
3. **Hand-crafted curated surface** — `PlakyClient` (TS), curated cobra commands (Go), curated MCP tools (TS). Owns pagination iterators, retries, idempotency, errors, rate-limit budget, interceptors, webhook helpers, mutation planning, workflow composition.

See `docs/surfaces.md`, `docs/codegen.md`, `docs/api-evolution.md`, `docs/release-checklist.md`.

## Environment

- `PLAKY115_API_KEY` (preferred) or `PLAKY115_API_KEY_AUTH` (fallback). Never commit a `plk_…` value — `npm run secret:scan` enforces this.

## TypeScript SDK

```ts
import { PlakyClient, statusField, fieldValues } from "plaky115";

const plaky = new PlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });

// Paginated iterator
for await (const space of plaky.spaces.iterate({ pageSize: 100 })) {
  console.log(space);
}

// Single-shot list
const items = await plaky.items.listAll({ spaceId: 123, boardId: 456 });

// Mutation with idempotency-key (auto-generated)
await plaky.items.create({
  spaceId: 123,
  boardId: 456,
  body: { title: "Ship API wrapper", fields: fieldValues({ Status: statusField("Done") }) },
});

// Dry-run planning
const plan = await plaky.items.create({ spaceId: 1, boardId: 2, body: { title: "x" }, dryRun: true });
// plan = { dryRun: true, operation: "createItem", payload: {...} }
```

## CLI

```bash
plaky115 --help
plaky115 doctor

# Raw API operations (one command per OpenAPI op)
plaky115 raw list-spaces
plaky115 raw get-item --space-id 123 --board-id 456 --item-id 789
plaky115 raw create-item --space-id 123 --board-id 456 --body '{"title":"hi"}'

# Curated workflows ship in Phase 9 of the toolkit roadmap:
#   plaky115 items create-simple --space-id … --board-id … --title …
#   plaky115 items bulk-update --file updates.json --dry-run
#   plaky115 comments add … --text … --dry-run
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

Modes: `--mode curated|generated|all` (default `all`). Scopes: `--scope read|write|destructive` (default all three). Curated tools: `plaky_search_docs`, `plaky_workspace_context`, `plaky_find`, `plaky_plan_mutation`, `plaky_execute_workflow`. 20 raw tools cover every Plaky operation directly.

See `docs/install-snippets.md` for Claude Desktop, Claude Code, Cursor, and local CLI examples.

## Regenerate

```bash
npm run generate:all      # types + ops + MCP + CLI + docs index
npm run status:surfaces   # report fresh/stale/legacy per surface
npm run pack:smoke        # validate sdk + mcp-server tarball contents
```

No Speakeasy cloud generation is involved. `speakeasy overlay` and `speakeasy lint` are used locally for OpenAPI tooling only.

## Development

```bash
npm --prefix sdk test           # 40 tests
npm --prefix mcp-server test    # 13 tests
(cd cli && go test ./... && go build ./...)
```

CI runs the full gate on every PR (`.github/workflows/ci.yml`).
