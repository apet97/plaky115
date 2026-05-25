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
    "text": "# Plaky115 Toolkit\n\nUnofficial, Speakeasy-generated tooling for the Plaky public API. This is not\nan official Plaky or CAKE.com package.\n\n## Artifacts\n\n- `sdk/` - TypeScript package `plaky115`\n- `cli/` - Go/Cobra CLI `plaky115`\n- `mcp-server/` - TypeScript MCP server package `plaky115-mcp`\n\nGenerated operation surfaces remain available. Hand-written DX lives in wrapper\nfiles and deterministic post-generation patches.\n\n## Environment\n\n- Plaky API: use `PLAKY115_API_KEY` locally. The generated\n  `PLAKY115_API_KEY_AUTH` variable is still supported.\n- Speakeasy generation: set `SPEAKEASY_API_KEY` only in the shell when running\n  `npm run regenerate`. Do not write it to files.\n\n## Regenerate\n\n```bash\nnpm run verify\nexport SPEAKEASY_API_KEY=...\nnpm run regenerate\n```\n\n`npm run verify` validates/applies the MCP overlay, runs OpenAPI lint, reapplies\nDX patches, and runs builds/tests without calling Speakeasy generation.\n\n## SDK\n\n```ts\nimport { createPlakyClient, fieldValues, statusField } from \"plaky115/plaky\";\n\nconst plaky = createPlakyClient({ apiKey: process.env.PLAKY115_API_KEY! });\n\nconst spaces = await plaky.spaces.listAll();\nconst items = await plaky.items.listAll({ space: \"Ops\", board: \"Roadmap\" });\n\nawait plaky.items.createSimple({\n  space: \"Ops\",\n  board: \"Roadmap\",\n  title: \"Ship API wrapper\",\n  fields: fieldValues({ Status: statusField(\"Done\") }),\n});\n```\n\n## CLI\n\n```bash\nexport PLAKY115_API_KEY=...\n\nplaky115 doctor\nplaky115 workspace map -o json\nplaky115 spaces list\nplaky115 boards list --space-id 123\nplaky115 items list --space-id 123 --board-id 456\nplaky115 items create-simple --space-id 123 --board-id 456 --title \"Smoke item\" --dry-run\nplaky115 comments add --space-id 123 --board-id 456 --item-id 789 --text \"Hello\" --dry-run\n```\n\nThe raw generated commands are still present under groups such as `spaces`,\n`boards`, `items`, and `item-comments`.\n\n## MCP\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\"],\n      \"env\": {\n        \"PLAKY115_API_KEY_AUTH\": \"...\"\n      }\n    }\n  }\n}\n```\n\nWhen `mcp start` runs without `--scope`, read and write tools are mounted. Use\n`--scope read` to mount read-only tools. Curated tools include\n`plaky_search_docs`, `plaky_workspace_context`, `plaky_find`,\n`plaky_list_items`, `plaky_plan_mutation`, and `plaky_execute_workflow`.\n\nUse `mcp start --mode curated`, `--mode generated`, or `--mode all` to choose\nthe mounted tool surface. Use `--scope read`, `--scope write`, or\n`--scope destructive` when the MCP client supports scope-based gating.\n\nSee [install snippets](docs/install-snippets.md) for Claude Desktop, Claude\nCode, Cursor, and local CLI examples.\n",
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
