// AUTO-GENERATED. Source: metadata + repo docs.
// Regenerate: npm run generate:docs-index

export type PlakyDocsEntry = {
  id: string;
  kind: "operation" | "workflow" | "guide";
  title: string;
  text: string;
  operationId?: string;
  scopes: Array<"read" | "write" | "destructive">;
};

export const docsIndex: PlakyDocsEntry[] = [
  {
    "id": "op:listSpaces",
    "kind": "operation",
    "title": "List spaces",
    "text": "List workspace spaces\nPath: GET /v1/public/spaces\nMCP tool: plaky_list_spaces\nScopes: read",
    "operationId": "listSpaces",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:listTeams",
    "kind": "operation",
    "title": "List teams",
    "text": "List workspace teams\nPath: GET /v1/public/teams\nMCP tool: plaky_list_teams\nScopes: read",
    "operationId": "listTeams",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:listUsers",
    "kind": "operation",
    "title": "List users",
    "text": "List workspace users\nPath: GET /v1/public/users\nMCP tool: plaky_list_users\nScopes: read",
    "operationId": "listUsers",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:listBoards",
    "kind": "operation",
    "title": "List boards",
    "text": "List space boards\nPath: GET /v1/public/spaces/{spaceId}/boards\nMCP tool: plaky_list_boards\nScopes: read",
    "operationId": "listBoards",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:listItems",
    "kind": "operation",
    "title": "List board items",
    "text": "List board items\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items\nMCP tool: plaky_list_items\nScopes: read",
    "operationId": "listItems",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:createItem",
    "kind": "operation",
    "title": "Create item",
    "text": "Create an item\nPath: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items\nMCP tool: plaky_create_item\nScopes: write",
    "operationId": "createItem",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:getSpace",
    "kind": "operation",
    "title": "Get space",
    "text": "Retrieve a space\nPath: GET /v1/public/spaces/{spaceId}\nMCP tool: plaky_get_space\nScopes: read",
    "operationId": "getSpace",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:getTeam",
    "kind": "operation",
    "title": "Get team",
    "text": "Retrieve a team\nPath: GET /v1/public/teams/{teamId}\nMCP tool: plaky_get_team\nScopes: read",
    "operationId": "getTeam",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:getCurrentUser",
    "kind": "operation",
    "title": "Get current user",
    "text": "Retrieve current user\nPath: GET /v1/public/users/me\nMCP tool: plaky_get_current_user\nScopes: read",
    "operationId": "getCurrentUser",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:getBoard",
    "kind": "operation",
    "title": "Get board",
    "text": "Retrieve a board\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}\nMCP tool: plaky_get_board\nScopes: read",
    "operationId": "getBoard",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:listSubitems",
    "kind": "operation",
    "title": "List subitems",
    "text": "List subitems\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items\nMCP tool: plaky_list_subitems\nScopes: read",
    "operationId": "listSubitems",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:getItem",
    "kind": "operation",
    "title": "Get item",
    "text": "Retrieve an item\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}\nMCP tool: plaky_get_item\nScopes: read",
    "operationId": "getItem",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:deleteItem",
    "kind": "operation",
    "title": "Delete item",
    "text": "Delete an item\nPath: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}\nMCP tool: plaky_delete_item\nScopes: write, destructive",
    "operationId": "deleteItem",
    "scopes": [
      "write",
      "destructive"
    ]
  },
  {
    "id": "op:updateItemField",
    "kind": "operation",
    "title": "Update item field",
    "text": "Update one item field\nPath: PATCH /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}\nMCP tool: plaky_update_item_field\nScopes: write",
    "operationId": "updateItemField",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:updateItemFields",
    "kind": "operation",
    "title": "Update item fields",
    "text": "Update item fields\nPath: PATCH /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields\nMCP tool: plaky_update_item_fields\nScopes: write",
    "operationId": "updateItemFields",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:listItemComments",
    "kind": "operation",
    "title": "List item comments",
    "text": "List item comments\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments\nMCP tool: plaky_list_item_comments\nScopes: read",
    "operationId": "listItemComments",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:createItemComment",
    "kind": "operation",
    "title": "Create item comment",
    "text": "Create item comment\nPath: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments\nMCP tool: plaky_create_item_comment\nScopes: write",
    "operationId": "createItemComment",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:updateItemComment",
    "kind": "operation",
    "title": "Update item comment",
    "text": "Update item comment\nPath: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}\nMCP tool: plaky_update_item_comment\nScopes: write",
    "operationId": "updateItemComment",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:deleteItemComment",
    "kind": "operation",
    "title": "Delete item comment",
    "text": "Delete item comment\nPath: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}\nMCP tool: plaky_delete_item_comment\nScopes: write, destructive",
    "operationId": "deleteItemComment",
    "scopes": [
      "write",
      "destructive"
    ]
  },
  {
    "id": "op:replaceCommentReactions",
    "kind": "operation",
    "title": "Replace comment reactions",
    "text": "Replace comment reactions\nPath: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions\nMCP tool: plaky_replace_comment_reactions\nScopes: write",
    "operationId": "replaceCommentReactions",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "wf:workspace.map",
    "title": "Workspace map",
    "text": "Discover spaces and boards before calling item workflows. Returns compact tree by default.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:items.search",
    "title": "Search items",
    "text": "Find items across boards by title fragment, status, person, or tag.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:items.create",
    "title": "Create item",
    "text": "Create an item with title and optional field values. Supports dry-run.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:items.updateFields",
    "title": "Bulk update item fields",
    "text": "Update many field values on one item in one call. Dry-run by default.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:comments.add",
    "title": "Add comment",
    "text": "Append a comment to an item.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:comments.thread",
    "title": "Comment thread",
    "text": "Read a comment thread compactly.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:export.items",
    "title": "Export items",
    "text": "Export board items as JSONL or CSV.",
    "kind": "workflow",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:README.md",
    "kind": "guide",
    "title": "README.md",
    "text": "# Plaky115 Toolkit\n\nUnofficial, hand-crafted SDK / CLI / MCP server for the Plaky public API. Not affiliated with Plaky or CAKE.com.\n\n## Artifacts\n\n- `sdk/` — TypeScript package `plaky115` (hand-crafted client, generated types).\n- `cli/` — Go/Cobra CLI `plaky115` (hand-crafted Go SDK + generated raw subtree).\n- `mcp-server/` — TypeScript MCP server `plaky115-mcp` (hand-crafted server + curated tools + generated raw tools).\n\n## Architecture (3 layers)\n\n1. **Generated types** — `sdk/src/generated/types.ts` from `openapi-typescript`.\n2. **Generated low-level operations** — one module per OpenAPI operation, scaffolded by in-repo Node scripts (`scripts/generate-*.mjs`) from `openapi/plaky115-operation-metadata.json`. Deterministic, idempotent.\n3. **Hand-crafted curated surface** — `PlakyClient` (TS), curated cobra commands (Go), curated MCP tools (TS). Owns pagination iterators, retries, idempotency, errors, rate-limit budget, interceptors, webhook helpers, mutation planning, workflow composition.\n\nSee `docs/surfaces.md`, `docs/codegen.md`, `docs/api-evolution.md`, `docs/release-checklist.md`.\n\n## Environment\n\n- `PLAKY115_API_KEY` (preferred) or `PLAKY115_API_KEY_AUTH` (fallback). Never commit a `plk_…` value — `npm run secret:scan` enforces this.\n\n## TypeScript SDK\n\n```ts\nimport { PlakyClient, statusField, fieldValues } from \"plaky115\";\n\nconst plaky = new PlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });\n\n// Paginated iterator\nfor await (const space of plaky.spaces.iterate({ pageSize: 100 })) {\n  console.log(space);\n}\n\n// Single-shot list\nconst items = await plaky.items.listAll({ spaceId: 123, boardId: 456 });\n\n// Mutation with idempotency-key (auto-generated)\nawait plaky.items.create({\n  spaceId: 123,\n  boardId: 456,\n  body: { title: \"Ship API wrapper\", fields: fieldValues({ Status: statusField(\"Done\") }) },\n});\n\n// Dry-run planning\nconst plan = await plaky.items.create({ spaceId: 1, boardId: 2, body: { title: \"x\" }, dryRun: true });\n// plan = { dryRun: true, operation: \"createItem\", payload: {...} }\n```\n\n## CLI\n\n```bash\nplaky115 --help\nplaky115 doctor\n\n# Raw API operations (one command per OpenAPI op)\nplaky115 raw list-spaces\nplaky115 raw get-item --space-id 123 --board-id 456 --item-id 789\nplaky115 raw create-item --space-id 123 --board-id 456 --body '{\"title\":\"hi\"}'\n\n# Curated workflows ship in Phase 9 of the toolkit roadmap:\n#   plaky115 items create-simple --space-id … --board-id … --title …\n#   plaky115 items bulk-update --file updates.json --dry-run\n#   plaky115 comments add … --text … --dry-run\n```\n\n## MCP Server\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\"],\n      \"env\": { \"PLAKY115_API_KEY\": \"...\" }\n    }\n  }\n}\n```\n\nModes: `--mode curated|generated|all` (default `all`). Scopes: `--scope read|write|destructive` (default all three). Curated tools: `plaky_search_docs`, `plaky_workspace_context`, `plaky_find`, `plaky_plan_mutation`, `plaky_execute_workflow`. 20 raw tools cover every Plaky operation directly.\n\nSee `docs/install-snippets.md` for Claude Desktop, Claude Code, Cursor, and local CLI examples.\n\n## Regenerate\n\n```bash\nnpm run generate:all      # types + ops + MCP + CLI + docs index\nnpm run status:surfaces   # report fresh/stale/legacy per surface\nnpm run pack:smoke        # validate sdk + mcp-server tarball contents\n```\n\nNo Speakeasy cloud generation is involved. `speakeasy overlay` and `speakeasy lint` are used locally for OpenAPI tooling only.\n\n## Development\n\n```bash\nnpm --prefix sdk test           # 40 tests\nnpm --prefix mcp-server test    # 13 tests\n(cd cli && go test ./... && go build ./...)\n```\n\nCI runs the full gate on every PR (`.github/workflows/ci.yml`).\n",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/live-smoke.md",
    "kind": "guide",
    "title": "docs/live-smoke.md",
    "text": "# Live Smoke\n\nUse only environment variables for secrets. Do not put API keys in commands,\nfiles, screenshots, or logs.\n\n## Read Checks\n\nThe full automated sweep covers raw API operations, SDK wrapper workflows, CLI\ncommands, and MCP curated/generated tools:\n\n```bash\nexport PLAKY115_API_KEY=...\nnpm run live:sweep\n```\n\nThe script creates clearly named `plaky115-live-smoke-*` sacrificial items and\ncomments, then cleans them up.\n\nManual checks:\n\n```bash\nexport PLAKY115_API_KEY=...\n\ncd cli\ngo build -o plaky115 ./cmd/plaky115\n./plaky115 doctor\n./plaky115 users get-workspace -o json\n./plaky115 spaces list -o json\n./plaky115 teams get-workspace -o json\n```\n\nPick the first writable `spaceId` and `boardId` from the read output:\n\n```bash\n./plaky115 boards list --space-id \"$SPACE_ID\" -o json\n./plaky115 items list --space-id \"$SPACE_ID\" --board-id \"$BOARD_ID\" -o json\n```\n\n## Write Checks\n\nOnly run these in a workspace where sacrificial data is allowed.\n\n```bash\nTITLE=\"plaky115 smoke $(date +%Y%m%d-%H%M%S)\"\n./plaky115 items create-simple \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --title \"$TITLE\" \\\n  --fields '{\"Status\":\"To do\"}' \\\n  -o json\n```\n\nCapture the created item ID from the response, then:\n\n```bash\n./plaky115 comments add \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\" \\\n  --text \"plaky115 smoke comment\" \\\n  -o json\n\n./plaky115 items update-fields \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\" \\\n  --fields '{\"Status\":\"Done\"}' \\\n  -o json\n\n./plaky115 items delete \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\" \\\n  --dry-run\n```\n\nRemove sacrificial items only after confirming the IDs are correct. Rotate the\nAPI key after smoke testing if the key was exposed outside an approved secret\nstore.\n",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/install-snippets.md",
    "kind": "guide",
    "title": "docs/install-snippets.md",
    "text": "# Install Snippets\n\nPlaky115 is an unofficial toolkit for the Plaky public API. It is not an\nofficial Plaky or CAKE.com package.\n\n## Claude Desktop\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\", \"--mode\", \"curated\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Claude Code\n\n```bash\nclaude mcp add plaky115 -- npx --yes --package /absolute/path/to/mcp-server -- mcp start --mode curated\n```\n\nSet `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.\n\n## Cursor\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\", \"--mode\", \"all\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Local CLI\n\n```bash\ncd cli\ngo build -o plaky115 ./cmd/plaky115\nexport PLAKY115_API_KEY=...\n./plaky115 doctor --live -o json\n```\n",
    "scopes": [
      "read"
    ]
  }
];
