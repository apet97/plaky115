# plaky115 CLI

Unofficial Go/Cobra CLI for the Plaky public API. Curated commands live at the
top level; raw OpenAPI-shaped commands live under `raw`.

## Auth

```bash
export PLAKY115_API_KEY=...
```

`PLAKY115_API_KEY_AUTH` remains a compatibility fallback. `--api-key` and
`--server-url` override the environment for one invocation.

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
plaky115 raw create-item --space-id 123 --board-id 456 --body '{"title":"New item"}'
```

Run `plaky115 raw --help` for the full operation list.
