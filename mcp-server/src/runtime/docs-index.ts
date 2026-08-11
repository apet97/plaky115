// AUTO-GENERATED. Source: metadata + repo docs.
// Regenerate: npm run generate:docs-index

export type PlakyDocsEntry = {
  id: string;
  kind: "operation" | "workflow" | "guide";
  title: string;
  text: string;
  operationId?: string;
  workflowId?: string;
  mutation?: boolean;
  destructive?: boolean;
  openWorld?: boolean;
  schemaKey?: string;
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
    "kind": "workflow",
    "title": "Map Plaky workspace",
    "text": "Discover spaces and boards before calling item workflows.\nReturns a bounded compact workspace tree with space and board identifiers, titles, and counts.",
    "workflowId": "workspace.map",
    "mutation": false,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "workspaceMap",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:items.search",
    "kind": "workflow",
    "title": "Search Plaky items",
    "text": "Search item titles and field values with exact continuation metadata.\nScans a bounded item window and reports matches, completeness, and a resumable page/index cursor.",
    "workflowId": "items.search",
    "mutation": false,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemsSearch",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:comments.thread",
    "kind": "workflow",
    "title": "Read an item comment thread",
    "text": "Read a bounded comment thread for one item.\nReturns compact comment records for the selected item.",
    "workflowId": "comments.thread",
    "mutation": false,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "commentsThread",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:export.items",
    "kind": "workflow",
    "title": "Export Plaky items",
    "text": "Return one bounded JSONL or CSV item export chunk.\nExports one bounded chunk with UTF-8 byte counts and an exact continuation cursor when more items remain.",
    "workflowId": "export.items",
    "mutation": false,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "exportItems",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "wf:items.create",
    "kind": "workflow",
    "title": "Create a Plaky item",
    "text": "Create an item after exact target and body validation; dry-run is the default.\nCreates one item or returns a validated dry-run plan without writing.",
    "workflowId": "items.create",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemsCreate",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "wf:items.updateFields",
    "kind": "workflow",
    "title": "Update Plaky item fields",
    "text": "Update field values on one or more items with durable per-item receipts.\nUpdates item fields at most once per item and retains completed receipts on partial failure.",
    "workflowId": "items.updateFields",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemsUpdateFields",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "wf:comments.add",
    "kind": "workflow",
    "title": "Add a Plaky comment",
    "text": "Append one comment after exact target and body validation; dry-run is the default.\nAdds one comment or returns a validated dry-run plan without writing.",
    "workflowId": "comments.add",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "commentsAdd",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "wf:itemGroups.create",
    "kind": "workflow",
    "title": "Create a Plaky item group",
    "text": "Create an item group with required title and color; dry-run is the default.\nCreates one item group with local required-field validation.",
    "workflowId": "itemGroups.create",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemGroupsCreate",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "wf:itemGroups.update",
    "kind": "workflow",
    "title": "Update a Plaky item group",
    "text": "Update an item group with required title, ranking, and color; dry-run is the default.\nUpdates one item group only after all required fields are validated locally.",
    "workflowId": "itemGroups.update",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemGroupsUpdate",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "wf:itemFiles.upload",
    "kind": "workflow",
    "title": "Upload a Plaky item file",
    "text": "Upload one canonical base64 file after bounded metadata and content validation; dry-run is the default.\nUploads one in-memory file; local paths are never accepted by the MCP surface.",
    "workflowId": "itemFiles.upload",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemFilesUpload",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "wf:itemFiles.update",
    "kind": "workflow",
    "title": "Update a Plaky item file",
    "text": "Update one item-file name or description after exact target validation; dry-run is the default.\nUpdates one item-file record or returns a validated dry-run plan without writing.",
    "workflowId": "itemFiles.update",
    "mutation": true,
    "destructive": false,
    "openWorld": true,
    "schemaKey": "itemFilesUpdate",
    "scopes": [
      "read",
      "write"
    ]
  },
  {
    "id": "guide:README.md",
    "kind": "guide",
    "title": "README.md",
    "text": "# Plaky115\n\n<div align=\"center\">\n\n**One repository for the Plaky public API — TypeScript SDK, Go CLI, and MCP server.**\n\n[![CI](https://github.com/apet97/plaky115/actions/workflows/ci.yml/badge.svg)](https://github.com/apet97/plaky115/actions/workflows/ci.yml)\n[![GitHub release](https://img.shields.io/github/v/release/apet97/plaky115?display_name=tag&sort=semver)](https://github.com/apet97/plaky115/releases)\n[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)\n\n[![SDK on npm](https://img.shields.io/npm/v/plaky115?label=SDK)](https://www.npmjs.com/package/plaky115)\n[![MCP on npm](https://img.shields.io/npm/v/plaky115-mcp?label=MCP)](https://www.npmjs.com/package/plaky115-mcp)\n[![Node.js >=22.12](https://img.shields.io/badge/node-%3E%3D22.12-339933?logo=node.js&logoColor=white)](sdk/package.json)\n[![Go 1.26](https://img.shields.io/badge/go-1.26-00ADD8?logo=go&logoColor=white)](cli/go.mod)\n\n[SDK guide](sdk/README.md) · [CLI guide](cli/README.md) · [MCP guide](mcp-server/README.md) · [Documentation](#documentation) · [Security](SECURITY.md)\n\n</div>\n\n> [!IMPORTANT]\n> Plaky115 is unofficial and independent. It is not affiliated with, endorsed by,\n> or sponsored by Plaky or CAKE.com. “Plaky” and “CAKE.com” are trademarks of\n> their respective owners.\n\n| Surface | Package | Best for |\n| --- | --- | --- |\n| TypeScript SDK | [`plaky115`](sdk/README.md) | Typed applications, scripts, pagination, and workflows |\n| Go CLI | [`plaky115`](cli/README.md) | Shell automation, exports, diagnostics, and exact raw commands |\n| MCP server | [`plaky115-mcp`](mcp-server/README.md) | Claude, Cursor, and other MCP clients with safe defaults |\n\n## Contents\n\n- [Quick start](#quick-start)\n- [What ships](#what-ships)\n- [Configuration](#configuration)\n- [Surface map](#surface-map)\n- [Documentation](#documentation)\n- [Development](#development)\n- [Live smoke](#live-smoke)\n- [Security and support](#security-and-support)\n- [License](#license)\n\n## Quick start\n\n### TypeScript SDK\n\n```bash\nnpm install plaky115\n```\n\n```ts\nimport { PlakyClient } from \"plaky115\";\n\nconst plaky = new PlakyClient({\n  apiKey: process.env.PLAKY115_API_KEY!,\n});\n\nfor await (const space of plaky.spaces.iterate({ pageSize: 100 })) {\n  console.log(space.id, space.title);\n}\n```\n\nSee the [SDK guide](sdk/README.md) for resources, pagination, errors, retries,\nuploads, typed IDs, interceptors, and workflow helpers.\n\n### Go CLI\n\nmacOS or Linux:\n\n```bash\nversion=v1.0.1\ncurl -fsSLo install-plaky115.sh \"https://raw.githubusercontent.com/apet97/plaky115/${version}/cli/scripts/install.sh\"\nless install-plaky115.sh\nPLAKY115_VERSION=\"$version\" bash install-plaky115.sh\nrm install-plaky115.sh\n```\n\n<details>\n<summary>Windows PowerShell</summary>\n\n```powershell\n$version = \"v1.0.1\"\nInvoke-WebRequest \"https://raw.githubusercontent.com/apet97/plaky115/$version/cli/scripts/install.ps1\" -OutFile install-plaky115.ps1\nGet-Content install-plaky115.ps1\n$env:PLAKY115_VERSION = $version\n./install-plaky115.ps1\nRemove-Item install-plaky115.ps1\n```\n\n</details>\n\n```bash\nexport PLAKY115_API_KEY=...\nplaky115 doctor\nplaky115 workspace-map\nplaky115 find --type item --space-id 123 --board-id 456 --query \"invoice\"\n```\n\nSee the [CLI guide](cli/README.md) for curated workflows, file uploads, CSV\nexports, dry runs, and all 32 raw commands.\n\n### MCP server\n\n```bash\nnpx --yes plaky115-mcp --help\n```\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"plaky115-mcp\"],\n      \"env\": { \"PLAKY115_API_KEY\": \"set-in-your-secret-store\" }\n    }\n  }\n}\n```\n\nThe default is equivalent to curated tools with read scope. Raw, write, and\ndestructive tools must be enabled explicitly. Uploads accept base64 content plus\nmetadata and never arbitrary local filesystem paths. See the [MCP guide](mcp-server/README.md)\nand [client installation snippets](docs/install-snippets.md).\n\n## What ships\n\n- Exact raw coverage for all **32 public operations** across CLI and MCP.\n- Hand-written, resource-oriented `PlakyClient` methods with generated schema\n  types as type-only escape hatches.\n- Item",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/live-smoke.md",
    "kind": "guide",
    "title": "docs/live-smoke.md",
    "text": "# Live Smoke\n\nUse only environment variables for secrets. Do not put API keys in commands,\nfiles, screenshots, or logs.\n\n## Automated Sweep\n\nThe GET-only sweep is safe for read authorization and never constructs a write:\n\n```bash\nnpm --prefix sdk run build\nnpm run live:read\n```\n\nIt covers all 17 documented GET operations on direct API and SDK surfaces.\n`getItemFile` and `getItemFileDownload` report `SKIP_PREREQUISITE` when no file\nexists; the sweep never creates one. Signed URLs are checked only in memory and\nnever emitted. Inject the API key through the environment without placing its\nvalue in shell history. The undocumented `/workspaces/<id>` route is never used.\n\nThe mutation-capable sweep requires separate sacrificial authorization:\n\nThe full opt-in sweep covers raw API operations, SDK wrapper workflows, CLI\ncommands, MCP boot checks, and real MCP curated/generated tool execution:\n\n```bash\nexport PLAKY115_API_KEY=...\nexport PLAKY115_SMOKE_SPACE_ID=...\nexport PLAKY115_SMOKE_BOARD_ID=...\nexport PLAKY115_SMOKE_ALLOW_ARCHIVE=1\nnpm run live:sweep\n```\n\n`PLAKY115_SMOKE_ALLOW_ARCHIVE=1` is an explicit acknowledgement that the sweep\nwill create, archive, and then delete one empty run-owned group per enabled\nsurface. Plaky has no public unarchive endpoint. Use only a sacrificial board,\nand do not start another run if deletion of an archived group reports an exact\nartifact ID; remove that artifact first.\n\nThe API, SDK, CLI, and MCP sections each cover Item Group list/get/create/update/\narchive/delete plus item-file upload/list/get/download/update/delete. The upload\nfixture is a short in-memory text value. Raw API, SDK, and CLI file listings must\nremain arrays; MCP returns its documented structured `data` envelope. Download\nlinks are validated in memory as non-empty HTTPS URLs with numeric expiry, but\nonly `urlPresent: true` and the expiry are included in the summary.\n\nPreflight validates the key presence, numeric space/board IDs, archive\nacknowledgement, and every enabled SDK/CLI/MCP build before the first API\nmutation. A failed preflight exits without creating remote data. The final\nstdout line is one JSON object: each operation contains a fixed surface,\noperation, and status plus numeric counts/IDs and booleans only. Workspace\ntitles, names, comments, file content, email addresses, response bodies, API\nkeys, and signed URLs are not serialized. Failure output is also JSON and\ncontains only `status`, an HTTP status when known, and the exact numeric\nartifact ID when manual cleanup is required.\n\nThe script creates one UUID per run and prefixes every artifact with the exact\nmarker `smoke:plaky115:<uuid>:`. Its in-memory ledger records each created group,\nitem, comment, and file by surface, operation, and ID. Cleanup deletes known\nchildren before parents, scans every listable resource family to recover a\ncreate response that was lost, and performs a final rescan. It never deletes a\ngeneric `smoke:` prefix or an artifact owned by another run.\n\nWhen SDK, CLI, or MCP sweeps are enabled, missing builds are hard failures rather\nthan skipped sections. GitHub Actions serializes runs targeting the same\nspace/board without cancelling a run during cleanup; different targets remain\nindependent. SIGINT and SIGTERM share the same in-flight cleanup promise and do\nnot exit until it settles. Cleanup treats HTTP 404 as already absent, continues\nafter other failures, exhausts pagination, and fails if the final rescan finds a\nleftover. A successful sweep ends with zero artifacts for its exact run marker.\n\n## Manual Read Checks\n\n```bash\nexport PLAKY115_API_KEY=...\n\ncd cli\ngo build -o plaky115 ./cmd/plaky115\n./plaky115 doctor\n./plaky115 raw list-users --page-size 5\n./plaky115 raw list-spaces --page-size 5\n./plaky115 raw list-teams --page-size 5\n```\n\nPick the first writable `spaceId` and `boardId` from the read output:\n\n```bash\n./plaky115 raw list-boards --space-id \"$SPACE_ID\" --page-size 5\n./plaky115 raw list-items --space-id \"$SPACE_ID\" --board-id \"$BOARD_ID\" --page-size 5\n./plaky115 workspace-map\n```\n\n## Manual Write Checks\n\nOnly run these in a works",
    "scopes": [
      "read"
    ]
  },
  {
    "id": "guide:docs/install-snippets.md",
    "kind": "guide",
    "title": "docs/install-snippets.md",
    "text": "# Install Snippets\n\nPlaky115 is an unofficial toolkit for the Plaky public API. It is not an\nofficial Plaky or CAKE.com package.\n\nThe SDK and MCP packages require Node.js `>=22.12`.\n\n## Claude Desktop\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"plaky115-mcp\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Claude Code\n\n```bash\nclaude mcp add plaky115 -- npx --yes plaky115-mcp\n```\n\nSet `PLAKY115_API_KEY` in the shell or Claude Code environment configuration.\n\n## Cursor\n\n```json\n{\n  \"mcpServers\": {\n    \"plaky115\": {\n      \"command\": \"npx\",\n      \"args\": [\"--yes\", \"plaky115-mcp\", \"--mode\", \"all\", \"--scope\", \"read\", \"--scope\", \"write\", \"--scope\", \"destructive\"],\n      \"env\": {\n        \"PLAKY115_API_KEY\": \"set-this-in-your-secret-store\"\n      }\n    }\n  }\n}\n```\n\n## Local CLI\n\n```bash\ncd cli\ngo build -o plaky115 ./cmd/plaky115\nexport PLAKY115_API_KEY=...\n./plaky115 doctor\n./plaky115 raw list-spaces --page-size 5\n```\n",
    "scopes": [
      "read"
    ]
  }
];
