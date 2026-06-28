# MCP recipes

The MCP server exposes curated workflow tools and one generated raw tool per
Plaky operation. Start it in curated mode for assistant-friendly workflows:

```bash
npx --yes --package /absolute/path/to/mcp-server -- mcp start --mode curated --scope read
```

Set `PLAKY115_API_KEY` in the host environment. Real workspaces are
account-prefixed; set `PLAKY115_BASE_URL=https://<account>.api.plaky.com` when
the generic host does not route.

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

Tool results include redacted JSON text plus a `structuredContent` object. Known
Plaky API failures return `isError: true` with structured error details.
