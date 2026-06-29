# plaky115 CLI

Unofficial Go/Cobra CLI for the Plaky public API. Curated commands live at the
top level; raw OpenAPI-shaped commands live under `raw`. Not affiliated with,
endorsed by, or sponsored by Plaky or CAKE.com.

## Auth

```bash
export PLAKY115_API_KEY=...
```

`PLAKY115_API_KEY_AUTH` remains a compatibility fallback. `--api-key`,
`--server-url`, `--timeout`, and `--user-agent` override defaults for one
invocation. Real Plaky workspaces are account-prefixed; pass
`--server-url https://<account>.api.plaky.com` when the default
`https://api.plaky.com` host does not route for your workspace.

## Curated Commands

```bash
plaky115 doctor
plaky115 workspace-map
plaky115 find --type space --query "ops"
plaky115 find --type board --space-id 123 --query "roadmap"
plaky115 find --type item --space-id 123 --board-id 456 --query "invoice"
plaky115 fields-list --space-id 123 --board-id 456 --show-config
plaky115 items-export --space-id 123 --board-id 456 --format csv
plaky115 items-create-simple --space-id 123 --board-id 456 --title "New item" --dry-run
plaky115 comments-add --space-id 123 --board-id 456 --item-id 789 --text "Note" --dry-run
plaky115 comments-thread --space-id 123 --board-id 456 --item-id 789
plaky115 reactions-replace --space-id 123 --board-id 456 --item-id 789 --comment-id 321 --body '{"reactions":[{"value":"1f44d"}]}' --dry-run
plaky115 items-bulk-update --file updates.json --dry-run
```

`workspace-map`, `find`, and `items-export` drain all pages instead of returning
only the first API page.

## Raw Commands

```bash
plaky115 raw list-spaces --page 1 --page-size 100
plaky115 raw list-boards --space-id 123 --page 1 --page-size 100
plaky115 raw list-items --space-id 123 --board-id 456 --page 1 --page-size 100
plaky115 raw get-item --space-id 123 --board-id 456 --item-id 789
plaky115 raw create-item --space-id 123 --board-id 456 --idempotency-key import-123 --body '{"title":"New item"}'
plaky115 raw update-item-fields --space-id 123 --board-id 456 --item-id 789 --body @payload.json
printf '{"title":"stdin"}' | plaky115 raw create-item --space-id 123 --board-id 456 --body @-
```

Run `plaky115 raw --help` for the full operation list.

## See Also

- [Repository README](https://github.com/apet97/plaky115#readme)
- [SECURITY.md](https://github.com/apet97/plaky115/blob/main/SECURITY.md) — API-key handling and the destructive-operation model
- [docs/api-behavior.md](https://github.com/apet97/plaky115/blob/main/docs/api-behavior.md) — verified wire behavior
- [LICENSE](https://github.com/apet97/plaky115/blob/main/LICENSE) — MIT
