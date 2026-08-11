# MCP recipes

The MCP server exposes curated workflow tools and one generated raw tool per
Plaky operation. Start it in curated mode for assistant-friendly workflows:

```bash
npx --yes plaky115-mcp --mode curated --scope read
```

Set `PLAKY115_API_KEY` in the host environment. Real workspaces are
account-prefixed; set `PLAKY115_BASE_URL=https://<account>.api.plaky.com` when
the generic host does not route.
When both are supplied, `--server-url` takes precedence over
`PLAKY115_BASE_URL`, which takes precedence over the SDK default. Invalid
explicit origins fail closed.

With no flags, the server already defaults to `--mode curated --scope read`.
Mount the full raw/write surface only when the host needs it:

```bash
npx --yes plaky115-mcp --mode all --scope read --scope write --scope destructive
```

## Scopes and modes

- `--mode curated` exposes the curated tools below.
- `--mode generated` exposes one raw tool per operation.
- `--mode all` exposes both.
- `--scope read` for read-only, `--scope write` to allow mutations, `--scope
  destructive` to allow deletes. Destructive operations carry a `destructiveHint`
  annotation; the host is expected to confirm before running them. See
  `../../SECURITY.md`.

## Curated tools

- `plaky_workspace_context` - summarize spaces, boards, and key entities.
- `plaky_search_docs` - search the bundled API/usage docs.
- `plaky_find` - find spaces, boards, or items by text.
- `plaky_plan_mutation` - preview a mutation payload before running it.
- `plaky_execute_workflow` - run a curated multi-step workflow.

## Example prompts

- "Map my Plaky workspace and list the boards in each space."
  -> the assistant calls `plaky_workspace_context`.
- "Find items mentioning 'invoice' on board 456 in space 123."
  -> the assistant calls `plaky_find`.
- "Plan adding a comment to item 789 but do not run it yet."
  -> the assistant calls `plaky_plan_mutation`.

Ordinary tool results include redacted JSON text plus a `structuredContent`
object. Bounded export results use a short summary as text and put the bounded
chunk in `structuredContent`. Known Plaky API failures return `isError: true`
with structured error details.

## Item Group and file raw recipes

Start with `--mode generated --scope read` for the list/get/download tools. The
host can call these exact tools with API-shaped arguments:

```json
{ "tool": "plaky_list_item_groups", "arguments": { "spaceId": 123, "boardId": 456, "page": 1, "pageSize": 100 } }
{ "tool": "plaky_get_item_group", "arguments": { "spaceId": 123, "boardId": 456, "itemGroupId": 321 } }
{ "tool": "plaky_list_item_files", "arguments": { "spaceId": 123, "boardId": 456, "itemId": 789 } }
{ "tool": "plaky_get_item_file", "arguments": { "spaceId": 123, "boardId": 456, "itemId": 789, "itemFileId": 654 } }
{ "tool": "plaky_get_item_file_download", "arguments": { "spaceId": 123, "boardId": 456, "itemId": 789, "itemFileId": 654 } }
```

The download result is a short-lived bearer capability. Ask the host to use it
for the immediate user request only; never paste it into logs or ask the server
to follow it.

Mutation examples require `--scope write`; archive/delete additionally require
`--scope destructive` and host confirmation:

```json
{ "tool": "plaky_create_item_group", "arguments": { "spaceId": 123, "boardId": 456, "body": { "title": "Review" } } }
{ "tool": "plaky_update_item_group", "arguments": { "spaceId": 123, "boardId": 456, "itemGroupId": 321, "body": { "title": "Reviewed", "ranking": "0|hzzzzz:" } } }
{ "tool": "plaky_archive_item_group", "arguments": { "spaceId": 123, "boardId": 456, "itemGroupId": 321 } }
{ "tool": "plaky_delete_item_group", "arguments": { "spaceId": 123, "boardId": 456, "itemGroupId": 321 } }
{ "tool": "plaky_upload_item_file", "arguments": { "spaceId": 123, "boardId": 456, "itemId": 789, "fileBase64": "aGVsbG8K", "fileName": "note.txt", "contentType": "text/plain" } }
{ "tool": "plaky_update_item_file", "arguments": { "spaceId": 123, "boardId": 456, "itemId": 789, "itemFileId": 654, "body": { "name": "renamed.txt" } } }
{ "tool": "plaky_delete_item_file", "arguments": { "spaceId": 123, "boardId": 456, "itemId": 789, "itemFileId": 654 } }
```

MCP upload accepts base64 only, with no local path input. The SDK uses `Blob`
and the CLI streams a file or stdin instead.
