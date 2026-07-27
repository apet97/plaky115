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
    "id": "op:listItemGroups",
    "kind": "operation",
    "title": "List item groups",
    "text": "List board item groups\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups\nMCP tool: plaky_list_item_groups\nScopes: read",
    "operationId": "listItemGroups",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:createItemGroup",
    "kind": "operation",
    "title": "Create item group",
    "text": "Create an item group\nPath: POST /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups\nMCP tool: plaky_create_item_group\nScopes: write",
    "operationId": "createItemGroup",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:deleteItemGroup",
    "kind": "operation",
    "title": "Delete item group",
    "text": "Delete an item group\nPath: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}\nMCP tool: plaky_delete_item_group\nScopes: write, destructive",
    "operationId": "deleteItemGroup",
    "scopes": [
      "write",
      "destructive"
    ]
  },
  {
    "id": "op:getItemGroup",
    "kind": "operation",
    "title": "Get item group",
    "text": "Retrieve an item group\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}\nMCP tool: plaky_get_item_group\nScopes: read",
    "operationId": "getItemGroup",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:updateItemGroup",
    "kind": "operation",
    "title": "Update item group",
    "text": "Update an item group\nPath: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}\nMCP tool: plaky_update_item_group\nScopes: write",
    "operationId": "updateItemGroup",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:archiveItemGroup",
    "kind": "operation",
    "title": "Archive item group",
    "text": "Archive an item group\nPath: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/item-groups/{itemGroupId}/archive\nMCP tool: plaky_archive_item_group\nScopes: write, destructive",
    "operationId": "archiveItemGroup",
    "scopes": [
      "write",
      "destructive"
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
    "id": "op:listItemFiles",
    "kind": "operation",
    "title": "List item files",
    "text": "List item files\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files\nMCP tool: plaky_list_item_files\nScopes: read",
    "operationId": "listItemFiles",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:uploadItemFile",
    "kind": "operation",
    "title": "Upload item file",
    "text": "Upload an item file\nPath: POST /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files\nMCP tool: plaky_upload_item_file\nScopes: write",
    "operationId": "uploadItemFile",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:deleteItemFile",
    "kind": "operation",
    "title": "Delete item file",
    "text": "Delete an item file\nPath: DELETE /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}\nMCP tool: plaky_delete_item_file\nScopes: write, destructive",
    "operationId": "deleteItemFile",
    "scopes": [
      "write",
      "destructive"
    ]
  },
  {
    "id": "op:getItemFile",
    "kind": "operation",
    "title": "Get item file",
    "text": "Retrieve an item file\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}\nMCP tool: plaky_get_item_file\nScopes: read",
    "operationId": "getItemFile",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "op:updateItemFile",
    "kind": "operation",
    "title": "Update item file",
    "text": "Update an item file\nPath: PUT /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}\nMCP tool: plaky_update_item_file\nScopes: write",
    "operationId": "updateItemFile",
    "scopes": [
      "write"
    ]
  },
  {
    "id": "op:getItemFileDownload",
    "kind": "operation",
    "title": "Get item file download",
    "text": "Get an item file download link\nPath: GET /v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/files/{itemFileId}/download\nMCP tool: plaky_get_item_file_download\nScopes: read",
    "operationId": "getItemFileDownload",
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
    "text": "# Plaky115\n\n[![CI](https://github.com/apet97/plaky115/actions/workflows/ci.yml/badge.svg)](https://github.com/apet97/plaky115/actions/workflows/ci.yml)\n\nUnofficial, hand-crafted developer toolkit for the Plaky public API:\n\n- TypeScript SDK package: `plaky115`\n- Go/Cobra CLI: `plaky115`\n- MCP server package: `plaky115-mcp`\n\n> [!IMPORTANT]\n> **Unofficial and independent.** Plaky115 is **not affiliated with, endorsed by,\n> or sponsored by Plaky or CAKE.com**. \"Plaky\" and \"CAKE.com\" are trademarks of\n> their respective owners. This project only targets the documented public Plaky\n> API and is provided as-is under the [MIT License](LICENSE).\n\nThe repo keeps generated code narrow and reviewable: OpenAPI schema types, raw\nCLI commands, raw MCP tools, and metadata indexes are generated locally and\nchecked in. The SDK client, runtime behavior, curated CLI commands, curated MCP\ntools, retry logic, pagination, and release gates are hand-written.\n\n## What It Ships\n\n- TypeScript SDK with stable `PlakyClient` resource methods.\n- Exact raw coverage for all 32 public operations, including the six Item Group\n  and six item-file operations.\n- Generated OpenAPI schema types exported as type-only escape hatches.\n- Pagination helpers: page APIs, `listAll`, and async iterators.\n- Runtime controls: retries, idempotency keys, timeouts, abort signals,\n  interceptors, custom fetch, custom headers, user-agent control, and rate-limit\n  snapshots.\n- Typed API errors with status, request ID, retry-after, headers, and response\n  body.\n- `requestWithResponse()` for status, headers, request IDs, and raw API paths.\n- Go CLI with curated workflows, generated raw API commands, idempotency flags,\n  file/stdin JSON bodies, and dry-run helpers.\n- MCP server with curated workflows, generated raw tools, `structuredContent`,\n  conservative `outputSchema` values, and structured tool errors.\n- Local release gates for generated drift, package contents, consumer smoke,\n  live smoke, secret scanning, and GoReleaser validation.\n\n## Repository Layout\n\n| Path | Purpose |\n| --- | --- |\n| `sdk/` | TypeScript package `plaky115`; hand-written client plus generated schema types. |\n| `cli/` | Go/Cobra CLI `plaky115`; curated commands plus generated raw subtree. |\n| `mcp-server/` | TypeScript MCP server `plaky115-mcp`; curated tools plus generated raw tools. |\n| `scripts/` | Local codegen, drift checks, package audits, live sweep, and release helpers. |\n| `docs/` | Surface, codegen, live-smoke, release, and API-evolution notes. |\n| `openapi/` | Overlay-applied OpenAPI document and operation metadata. |\n\n## Requirements\n\n- Node.js `>=22.12` for SDK and MCP package builds.\n- Bun `1.2.17` for the MCP executable bundle.\n- Go `1.26.x` for the CLI.\n- Ruby for local OpenAPI overlay, lint, and metadata checks.\n- GoReleaser for CLI release configuration validation.\n\nSet an API key when calling live Plaky endpoints:\n\n```bash\nexport PLAKY115_API_KEY=...\n```\n\n`PLAKY115_API_KEY_AUTH` remains a compatibility fallback. Never commit or print\n`plk_` values; `npm run secret:scan` is part of the release gate.\n\n## Install Locally\n\n```bash\nnpm --prefix sdk ci\nnpm --prefix mcp-server ci\n(cd cli && go mod download)\n```\n\nBuild the SDK and MCP packages:\n\n```bash\nnpm --prefix sdk run build\nnpm --prefix mcp-server run build\n```\n\nBuild the CLI:\n\n```bash\n(cd cli && go build -o /tmp/plaky115 ./cmd/plaky115)\n```\n\n## TypeScript SDK\n\n```ts\nimport { PlakyClient, fieldValues, statusField } from \"plaky115\";\n\nconst plaky = new PlakyClient({\n  apiKey: process.env.PLAKY115_API_KEY!,\n});\n\nfor await (const space of plaky.spaces.iterate({ pageSize: 100 })) {\n  console.log(space.id, space.title);\n}\n\nconst spaceId = 123;\nconst boardId = 456;\n\nconst items = await plaky.items.listAll({ spaceId, boardId });\n\nawait plaky.items.create({\n  spaceId,\n  boardId,\n  body: {\n    title: \"Ship API wrapper\",\n    fields: fieldValues({ Status: statusField(\"Done\") }),\n  },\n});\n```\n\nOnly `GET` requests can retry. Writes remain single-attempt even when an\nidempotency key is present, and the SDK never generates a key. A caller may\nsupply an",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/live-smoke.md",
    "kind": "guide",
    "title": "docs/live-smoke.md",
    "text": "# Live Smoke\n\nUse only environment variables for secrets. Do not put API keys in commands,\nfiles, screenshots, or logs.\n\n## Automated Sweep\n\nThe full opt-in sweep covers raw API operations, SDK wrapper workflows, CLI\ncommands, MCP boot checks, and real MCP curated/generated tool execution:\n\n```bash\nexport PLAKY115_API_KEY=...\nexport PLAKY115_SMOKE_SPACE_ID=...\nexport PLAKY115_SMOKE_BOARD_ID=...\nexport PLAKY115_SMOKE_ALLOW_ARCHIVE=1\nnpm run live:sweep\n```\n\n`PLAKY115_SMOKE_ALLOW_ARCHIVE=1` is an explicit acknowledgement that the sweep\nwill create, archive, and then delete one empty run-owned group per enabled\nsurface. Plaky has no public unarchive endpoint. Use only a sacrificial board,\nand do not start another run if deletion of an archived group reports an exact\nartifact ID; remove that artifact first.\n\nThe API, SDK, CLI, and MCP sections each cover Item Group list/get/create/update/\narchive/delete plus item-file upload/list/get/download/update/delete. The upload\nfixture is a short in-memory text value. Raw API, SDK, and CLI file listings must\nremain arrays; MCP returns its documented structured `data` envelope. Download\nlinks are validated in memory as non-empty HTTPS URLs with numeric expiry, but\nonly `urlPresent: true` and the expiry are included in the summary.\n\nPreflight validates the key presence, numeric space/board IDs, archive\nacknowledgement, and every enabled SDK/CLI/MCP build before the first API\nmutation. A failed preflight exits without creating remote data. The final\nstdout line is one JSON object: each operation contains a fixed surface,\noperation, and status plus numeric counts/IDs and booleans only. Workspace\ntitles, names, comments, file content, email addresses, response bodies, API\nkeys, and signed URLs are not serialized. Failure output is also JSON and\ncontains only `status`, an HTTP status when known, and the exact numeric\nartifact ID when manual cleanup is required.\n\nThe script creates one UUID per run and prefixes every artifact with the exact\nmarker `smoke:plaky115:<uuid>:`. Its in-memory ledger records each created group,\nitem, comment, and file by surface, operation, and ID. Cleanup deletes known\nchildren before parents, scans every listable resource family to recover a\ncreate response that was lost, and performs a final rescan. It never deletes a\ngeneric `smoke:` prefix or an artifact owned by another run.\n\nWhen SDK, CLI, or MCP sweeps are enabled, missing builds are hard failures rather\nthan skipped sections. GitHub Actions serializes runs targeting the same\nspace/board without cancelling a run during cleanup; different targets remain\nindependent. SIGINT and SIGTERM share the same in-flight cleanup promise and do\nnot exit until it settles. Cleanup treats HTTP 404 as already absent, continues\nafter other failures, exhausts pagination, and fails if the final rescan finds a\nleftover. A successful sweep ends with zero artifacts for its exact run marker.\n\n## Manual Read Checks\n\n```bash\nexport PLAKY115_API_KEY=...\n\ncd cli\ngo build -o plaky115 ./cmd/plaky115\n./plaky115 doctor\n./plaky115 raw list-users --page-size 5\n./plaky115 raw list-spaces --page-size 5\n./plaky115 raw list-teams --page-size 5\n```\n\nPick the first writable `spaceId` and `boardId` from the read output:\n\n```bash\n./plaky115 raw list-boards --space-id \"$SPACE_ID\" --page-size 5\n./plaky115 raw list-items --space-id \"$SPACE_ID\" --board-id \"$BOARD_ID\" --page-size 5\n./plaky115 workspace-map\n```\n\n## Manual Write Checks\n\nOnly run these in a workspace where sacrificial data is allowed. Start with\ndry-run plans:\n\n```bash\nTITLE=\"plaky115 smoke $(date +%Y%m%d-%H%M%S)\"\n./plaky115 items-create-simple \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --title \"$TITLE\" \\\n  --dry-run\n```\n\nRemove `--dry-run` only in a sacrificial workspace. Capture the created item ID\nfrom the response, then:\n\n```bash\n./plaky115 comments-add \\\n  --space-id \"$SPACE_ID\" \\\n  --board-id \"$BOARD_ID\" \\\n  --item-id \"$ITEM_ID\" \\\n  --text \"plaky115 smoke comment\" \\\n  --dry-run\n\ncat > /tmp/plaky115-updates.json <<JSON\n[\n  {\n    \"spaceId\": \"$SPACE_ID\",\n    \"boardId\": \"$BO",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/install-snippets.md",
    "kind": "guide",
    "title": "docs/install-snippets.md",
    "text": "# Install Snippets\n\nPlaky115 is an unofficial toolkit for the Plaky public API. It is not an\nofficial Plaky or CAKE.com package.\n\nThe SDK and MCP packages require Node.js `>=22.12`.\n\n## Claude Desktop\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Claude Code\n\n```bash\nclaude mcp add plaky115 -- npx --yes --package /absolute/path/to/mcp-server -- mcp\n```\n\nSet `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.\n\n## Cursor\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"--package\", \"/absolute/path/to/mcp-server\", \"--\", \"mcp\", \"--mode\", \"all\", \"--scope\", \"read\", \"--scope\", \"write\", \"--scope\", \"destructive\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Local CLI\n\n```bash\ncd cli\ngo build -o plaky115 ./cmd/plaky115\nexport PLAKY115_API_KEY=...\n./plaky115 doctor\n./plaky115 raw list-spaces --page-size 5\n```\n",
    "scopes": [
      "read"
    ]
  }
];
