# plaky115-mcp

Unofficial local MCP server for the Plaky public API. It ships a small curated
tool surface for agents plus optional raw tools for one-to-one API operations.
Not affiliated with, endorsed by, or sponsored by Plaky or CAKE.com.

## Run

```bash
export PLAKY115_API_KEY=...
npx --yes --package . -- mcp start
```

Requires Node.js `>=22.12`.

Real Plaky workspaces are account-prefixed. If the default `https://api.plaky.com`
host does not route for your workspace, set `PLAKY115_BASE_URL` (or pass
`--server-url`) to `https://<account>.api.plaky.com`.

Use `--mode curated`, `--mode generated`, or `--mode all` to choose the tool
surface. Use repeated `--scope read`, `--scope write`, or `--scope destructive`
flags to mount the required behavior surface. When omitted, mode defaults to `curated` and scope defaults to `read`;
typos and unknown arguments exit with a usage error instead of broadening
access.

Request the prior broad surface explicitly:

```bash
mcp --mode all --scope read --scope write --scope destructive
```

## Curated Tools

- `plaky_search_docs`
- `plaky_workspace_context`
- `plaky_find`
- `plaky_plan_mutation`
- `plaky_execute_read_workflow`
- `plaky_execute_mutation_workflow`
- `plaky_execute_workflow` (deprecated compatibility tool)

Workflow arguments use strict, workflow-specific schemas. The read tool covers
`workspace.map`, `items.search`, `comments.thread`, and `export.items` under the
default read scope. The mutation tool covers `items.create`,
`items.updateFields`, and `comments.add`; it stays in dry-run mode unless
`dryRun: false` is supplied. `plaky_plan_mutation` accepts only those three
mutation workflow IDs.

Curated responses are compact by default. Pass `includeRaw: true` when a client
needs the original Plaky API payload.

Tool results include both redacted JSON text in `content[0].text` and the same
machine-readable object in `structuredContent`. Known Plaky API failures are
returned as tool errors with `isError: true` and structured error details, so
clients can recover from 404s, rate limits, and validation errors without
treating them as MCP protocol failures.

## Raw Tools

Raw tools are available in `generated` and `all` modes. They are named from the
operation metadata and keep the API-shaped request payloads. Prefer curated
tools for discovery, planning, and agent workflows; use raw tools for exact API
coverage. Raw tools also register conservative `outputSchema` definitions; void
delete operations return `{ "ok": true }` receipts.

The Item Group raw tools are `plaky_list_item_groups`,
`plaky_get_item_group`, `plaky_create_item_group`,
`plaky_update_item_group`, `plaky_archive_item_group`, and
`plaky_delete_item_group`. The item-file tools are `plaky_list_item_files`,
`plaky_upload_item_file`, `plaky_get_item_file`,
`plaky_get_item_file_download`, `plaky_update_item_file`, and
`plaky_delete_item_file`.

`plaky_upload_item_file` accepts canonical `fileBase64`, `fileName`, and an
optional `contentType`; it never accepts an arbitrary local filesystem path.
Decoded content defaults to a 10 MiB limit, configurable only up to the 25 MiB
hard ceiling. File listing returns the documented structured `data` envelope.
The download tool returns a short-lived signed URL only in the requested result;
the server does not follow, persist, or log it.

## License

MIT — see the bundled `LICENSE` file.

## See Also

- [Repository README](https://github.com/apet97/plaky115#readme)
- [SECURITY.md](https://github.com/apet97/plaky115/blob/main/SECURITY.md) — API-key handling and the destructive-operation model
- [docs/install-snippets.md](https://github.com/apet97/plaky115/blob/main/docs/install-snippets.md) — Claude Desktop, Claude Code, and Cursor config
- [examples/mcp/](https://github.com/apet97/plaky115/tree/main/examples/mcp) — MCP host config and recipes
