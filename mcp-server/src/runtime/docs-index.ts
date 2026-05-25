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
    "text": "# Plaky115 Toolkit\n\nUnofficial, hand-crafted SDK / CLI / MCP server for the Plaky public API. Not affiliated with Plaky or CAKE.com.\n\n## Artifacts\n\n- `sdk/` - TypeScript package `plaky115` (hand-crafted client, generated types).\n- `cli/` - Go/Cobra CLI `plaky115` (hand-crafted Go SDK plus generated raw subtree).\n- `mcp-server/` - TypeScript MCP server `plaky115-mcp` (hand-crafted server plus curated tools and generated raw tools).\n\n## Architecture\n\n1. Generated types: `sdk/src/generated/types.ts` from `openapi-typescript`.\n2. Generated low-level operations: one module per OpenAPI operation, scaffolded by local Node scripts from `openapi/plaky115-operation-metadata.json`.\n3. Hand-crafted surfaces: `PlakyClient`, curated Go commands, and curated MCP tools. This layer owns pagination helpers, retries, idempotency keys, normalized errors, rate-limit snapshots, interceptors, webhook helpers, mutation planning, and workflow composition.\n\nSee `docs/surfaces.md`, `docs/codegen.md`, `docs/api-evolution.md`, and `docs/release-checklist.md`.\n\n## Environment\n\n- `PLAKY115_API_KEY` is preferred.\n- `PLAKY115_API_KEY_AUTH` remains a compatibility fallback.\n- Never commit a `plk_` value. `npm run secret:scan` enforces this.\n\n## TypeScript SDK\n\n```ts\nimport { BoardId, PlakyClient, SpaceId, statusField, fieldValues } from \"plaky115\";\n\nconst plaky = new PlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });\n\nfor await (const space of plaky.spaces.iterate({ pageSize: 100 })) {\n  console.log(space);\n}\n\nconst spaceId = SpaceId(123);\nconst boardId = BoardId(456);\nconst items = await plaky.items.listAll({ spaceId, boardId });\n\nawait plaky.items.create({\n  spaceId,\n  boardId,\n  body: { title: \"Ship API wrapper\", fields: fieldValues({ Status: statusField(\"Done\") }) },\n});\n\nconst plan = await plaky.items.create({ spaceId, boardId, body: { title: \"x\" }, dryRun: true });\n// plan = { dryRun: true, operation: \"createItem\", payload: {...} }\n```\n\nMutations attach idempotency keys by default. Retries are conservative: `GET`\nrequests can retry, and write requests retry only when an idempotency key is\npresent.\n\n## CLI\n\n```bash\nplaky115 --help\nplaky115 doctor\n\n# Curated commands\nplaky115 workspace-map\nplaky115 find --type item --space-id 123 --board-id 456 --query \"invoice\"\nplaky115 fields-list --space-id 123 --board-id 456\nplaky115 items-export --space-id 123 --board-id 456 --format jsonl\nplaky115 items-create-simple --space-id 123 --board-id 456 --title \"Follow up\" --dry-run\nplaky115 comments-add --space-id 123 --board-id 456 --item-id 789 --text \"Note\" --dry-run\nplaky115 items-bulk-update --file updates.json --dry-run\n\n# Raw API operations\nplaky115 raw list-spaces\nplaky115 raw get-item --space-id 123 --board-id 456 --item-id 789\nplaky115 raw create-item --space-id 123 --board-id 456 --body '{\"title\":\"hi\"}'\n```\n\n## MCP Server\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\"],\n      \"env\": { \"PLAKY115_API_KEY\": \"...\" }\n    }\n  }\n}\n```\n\nModes: `--mode curated|generated|all` (default `all`). Scopes:\n`--scope read|write|destructive` (default all three). Curated tools:\n`plaky_search_docs`, `plaky_workspace_context`, `plaky_find`,\n`plaky_plan_mutation`, and `plaky_execute_workflow`. Raw mode exposes one tool\nper Plaky operation.\n\nSee `docs/install-snippets.md` for Claude Desktop, Claude Code, Cursor, and local CLI examples.\n\n## Local Gates\n\n```bash\nnpm run verify\nnpm run pack:smoke\nnpm run secret:scan\n(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)\n```\n\n## Regenerate\n\n`npm run generate:all` rebuilds types, operation wrappers, MCP raw tools, CLI raw\ncommands, and the MCP docs index. `npm run status:surfaces:strict` fails if any\ngenerated surface is stale or legacy.\n\nNo Speakeasy cloud generation is involved. Speakeasy is used locally only for\noverlay validation and OpenAPI linting.\n",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/live-smoke.md",
    "kind": "guide",
    "title": "docs/live-smoke.md",
    "text": "# Live Smoke\n\nUse only environment variables for secrets. Do not put API keys in commands,\nfiles, screenshots, or logs.\n\n## Automated Sweep\n\nThe full opt-in sweep covers raw API operations, SDK wrapper workflows, CLI\ncommands, and MCP curated/generated tools:\n\n```bash\nexport PLAKY115_API_KEY=...\nexport PLAKY115_SMOKE_SPACE_ID=...\nexport PLAKY115_SMOKE_BOARD_ID=...\nnpm run live:sweep\n```\n\nThe script creates clearly named `plaky115-live-smoke-*` sacrificial items and\ncomments, then cleans them up.\n\n## Manual Read Checks\n\n```bash\nexport PLAKY115_API_KEY=...\n\ncd cli\ngo build -o plaky115 ./cmd/plaky115\n./plaky115 doctor\n./plaky115 raw list-users --page-size 5\n./plaky115 raw list-spaces --page-size 5\n./plaky115 raw list-teams --page-size 5\n```\n\nPick the first writable `spaceId` and `boardId` from the read output:\n\n```bash\n./plaky115 raw list-boards --space-id \"$SPACE_ID\" --page-size 5\n./plaky115 raw list-items --space-id \"$SPACE_ID\" --board-id \"$BOARD_ID\" --page-size 5\n./plaky115 workspace-map\n```\n\n## Manual Write Checks\n\nOnly run these in a workspace where sacrificial data is allowed. Start with\ndry-run plans:\n\n```bash\nTITLE=\"plaky115 smoke $(date +%Y%m%d-%H%M%S)\"\n./plaky115 items-create-simple \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --title \"$TITLE\" \\\n  --dry-run\n```\n\nRemove `--dry-run` only in a sacrificial workspace. Capture the created item ID\nfrom the response, then:\n\n```bash\n./plaky115 comments-add \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\" \\\n  --text \"plaky115 smoke comment\" \\\n  --dry-run\n\ncat > /tmp/plaky115-updates.json <<JSON\n[\n  {\n    \"spaceId\": \"$SPACE_ID\",\n    \"boardId\": \"$BOARD_ID\",\n    \"itemId\": \"$ITEM_ID\",\n    \"body\": { \"fields\": { \"Status\": \"Done\" } }\n  }\n]\nJSON\n\n./plaky115 items-bulk-update --file /tmp/plaky115-updates.json --dry-run\n```\n\nAfter confirming the IDs are sacrificial, clean up with the raw delete command:\n\n```bash\n./plaky115 raw delete-item \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\"\n```\n\nRotate the API key after smoke testing if the key was exposed outside an\napproved secret store.\n",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/install-snippets.md",
    "kind": "guide",
    "title": "docs/install-snippets.md",
    "text": "# Install Snippets\n\nPlaky115 is an unofficial toolkit for the Plaky public API. It is not an\nofficial Plaky or CAKE.com package.\n\n## Claude Desktop\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\", \"--mode\", \"curated\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Claude Code\n\n```bash\nclaude mcp add plaky115 -- npx --yes --package /absolute/path/to/mcp-server -- mcp start --mode curated\n```\n\nSet `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.\n\n## Cursor\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\", \"--mode\", \"all\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Local CLI\n\n```bash\ncd cli\ngo build -o plaky115 ./cmd/plaky115\nexport PLAKY115_API_KEY=...\n./plaky115 doctor\n./plaky115 raw list-spaces --page-size 5\n```\n",
    "scopes": [
      "read"
    ]
  }
];
