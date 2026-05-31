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
    "text": "# Plaky115\n\n[![CI](https://github.com/apet97/plaky115/actions/workflows/ci.yml/badge.svg)](https://github.com/apet97/plaky115/actions/workflows/ci.yml)\n\nUnofficial, hand-crafted developer toolkit for the Plaky public API:\n\n- TypeScript SDK package: `plaky115`\n- Go/Cobra CLI: `plaky115`\n- MCP server package: `plaky115-mcp`\n\nPlaky115 is not affiliated with Plaky or CAKE.com. It is built to feel like a\npolished SDK while preserving a deterministic local generation model: generated\nschema/raw surfaces are checked into the repo, and the ergonomic client, CLI,\nMCP tools, retry behavior, pagination helpers, and release gates are\nhand-written.\n\n## What You Get\n\n- Typed TypeScript client with stable `PlakyClient` resource methods.\n- Auto-pagination helpers, `listAll`, and async iterators.\n- Conservative retries with backoff and idempotency-aware write retries.\n- Typed API errors with status, request ID, retry-after, headers, and body.\n- `requestWithResponse()` for raw response metadata and low-level escape hatches.\n- Rate-limit snapshots, request/response interceptors, timeouts, abort handling,\n  user-agent control, and webhook helpers.\n- Go CLI with curated workflows plus generated raw API commands.\n- MCP server with curated assistant-friendly tools plus generated raw tools.\n- Local release gates for generated drift, package contents, consumer smoke,\n  live smoke, secret scanning, and GoReleaser validation.\n\n## Repository Layout\n\n| Path | Purpose |\n| --- | --- |\n| `sdk/` | TypeScript package `plaky115`; hand-written client plus generated schema types. |\n| `cli/` | Go/Cobra CLI `plaky115`; curated commands plus generated raw subtree. |\n| `mcp-server/` | TypeScript MCP server `plaky115-mcp`; curated tools plus generated raw tools. |\n| `scripts/` | Local codegen, drift checks, package audits, live sweep, and release helpers. |\n| `docs/` | Surface, codegen, live-smoke, release, and API-evolution notes. |\n| `openapi/` | Overlay-applied OpenAPI document and operation metadata. |\n\n## Requirements\n\n- Node.js `>=22.12` for SDK and MCP package builds.\n- Bun `1.2.17` for the MCP executable bundle.\n- Go `1.26.x` for the CLI.\n- Ruby for local OpenAPI overlay, lint, and metadata checks.\n- GoReleaser for CLI release configuration validation.\n\nSet an API key when calling live Plaky endpoints:\n\n```bash\nexport PLAKY115_API_KEY=...\n```\n\n`PLAKY115_API_KEY_AUTH` remains a compatibility fallback. Never commit or print\n`plk_` values; `npm run secret:scan` is part of the release gate.\n\n## Install Locally\n\n```bash\nnpm --prefix sdk ci\nnpm --prefix mcp-server ci\n(cd cli && go mod download)\n```\n\nBuild the SDK and MCP packages:\n\n```bash\nnpm --prefix sdk run build\nnpm --prefix mcp-server run build\n```\n\nBuild the CLI:\n\n```bash\n(cd cli && go build -o /tmp/plaky115 ./cmd/plaky115)\n```\n\n## TypeScript SDK\n\n```ts\nimport { PlakyClient, fieldValues, statusField } from \"plaky115\";\n\nconst plaky = new PlakyClient({\n  apiKey: process.env.PLAKY115_API_KEY!,\n});\n\nfor await (const space of plaky.spaces.iterate({ pageSize: 100 })) {\n  console.log(space.id, space.title);\n}\n\nconst spaceId = 123;\nconst boardId = 456;\n\nconst items = await plaky.items.listAll({ spaceId, boardId });\n\nawait plaky.items.create({\n  spaceId,\n  boardId,\n  body: {\n    title: \"Ship API wrapper\",\n    fields: fieldValues({ Status: statusField(\"Done\") }),\n  },\n});\n```\n\nMutations attach idempotency keys by default. `GET` requests can retry, and write\nrequests retry only when an idempotency key is present.\n\nUse `requestWithResponse()` when you need status, headers, request IDs, or a raw\nAPI path:\n\n```ts\nconst response = await plaky.requestWithResponse({\n  method: \"GET\",\n  path: \"/v1/public/spaces\",\n});\n\nconsole.log(response.status, response.requestId, response.data);\n```\n\n`CommentShape` exposes both `content` for the API response field and `text` for\ncaller compatibility.\n\n## CLI\n\n```bash\nplaky115 --help\nplaky115 doctor\n\n# Curated workflows\nplaky115 workspace-map\nplaky115 find --type item --space-id 123 --board-id 456 --query \"invoice\"\nplaky115 fields-list --space-id 123 --board-id 456\nplaky115 items-export ",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/live-smoke.md",
    "kind": "guide",
    "title": "docs/live-smoke.md",
    "text": "# Live Smoke\n\nUse only environment variables for secrets. Do not put API keys in commands,\nfiles, screenshots, or logs.\n\n## Automated Sweep\n\nThe full opt-in sweep covers raw API operations, SDK wrapper workflows, CLI\ncommands, MCP boot checks, and real MCP curated/generated tool execution:\n\n```bash\nexport PLAKY115_API_KEY=...\nexport PLAKY115_SMOKE_SPACE_ID=...\nexport PLAKY115_SMOKE_BOARD_ID=...\nnpm run live:sweep\n```\n\nThe script creates clearly named `smoke:` sacrificial items and comments, then\ncleans them up and reports the leftover count. When SDK, CLI, or MCP sweeps are\nenabled, missing builds are hard failures rather than skipped sections. A\nsuccessful sweep must complete the cleanup scan and end with leftover count `0`.\n\n## Manual Read Checks\n\n```bash\nexport PLAKY115_API_KEY=...\n\ncd cli\ngo build -o plaky115 ./cmd/plaky115\n./plaky115 doctor\n./plaky115 raw list-users --page-size 5\n./plaky115 raw list-spaces --page-size 5\n./plaky115 raw list-teams --page-size 5\n```\n\nPick the first writable `spaceId` and `boardId` from the read output:\n\n```bash\n./plaky115 raw list-boards --space-id \"$SPACE_ID\" --page-size 5\n./plaky115 raw list-items --space-id \"$SPACE_ID\" --board-id \"$BOARD_ID\" --page-size 5\n./plaky115 workspace-map\n```\n\n## Manual Write Checks\n\nOnly run these in a workspace where sacrificial data is allowed. Start with\ndry-run plans:\n\n```bash\nTITLE=\"plaky115 smoke $(date +%Y%m%d-%H%M%S)\"\n./plaky115 items-create-simple \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --title \"$TITLE\" \\\n  --dry-run\n```\n\nRemove `--dry-run` only in a sacrificial workspace. Capture the created item ID\nfrom the response, then:\n\n```bash\n./plaky115 comments-add \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\" \\\n  --text \"plaky115 smoke comment\" \\\n  --dry-run\n\ncat > /tmp/plaky115-updates.json <<JSON\n[\n  {\n    \"spaceId\": \"$SPACE_ID\",\n    \"boardId\": \"$BOARD_ID\",\n    \"itemId\": \"$ITEM_ID\",\n    \"body\": { \"fields\": { \"Status\": \"Done\" } }\n  }\n]\nJSON\n\n./plaky115 items-bulk-update --file /tmp/plaky115-updates.json --dry-run\n```\n\nAfter confirming the IDs are sacrificial, clean up with the raw delete command:\n\n```bash\n./plaky115 raw delete-item \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\"\n```\n\nRotate the API key after smoke testing if the key was exposed outside an\napproved secret store.\n",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/install-snippets.md",
    "kind": "guide",
    "title": "docs/install-snippets.md",
    "text": "# Install Snippets\n\nPlaky115 is an unofficial toolkit for the Plaky public API. It is not an\nofficial Plaky or CAKE.com package.\n\nThe SDK and MCP packages require Node.js `>=22.12`.\n\n## Claude Desktop\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\", \"--mode\", \"curated\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Claude Code\n\n```bash\nclaude mcp add plaky115 -- npx --yes --package /absolute/path/to/mcp-server -- mcp start --mode curated\n```\n\nSet `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.\n\n## Cursor\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"start\", \"--mode\", \"all\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Local CLI\n\n```bash\ncd cli\ngo build -o plaky115 ./cmd/plaky115\nexport PLAKY115_API_KEY=...\n./plaky115 doctor\n./plaky115 raw list-spaces --page-size 5\n```\n",
    "scopes": [
      "read"
    ]
  }
];
