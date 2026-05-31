# Live Smoke

Use only environment variables for secrets. Do not put API keys in commands,
files, screenshots, or logs.

## Automated Sweep

The full opt-in sweep covers raw API operations, SDK wrapper workflows, CLI
commands, MCP boot checks, and real MCP curated/generated tool execution:

```bash
export PLAKY115_API_KEY=...
export PLAKY115_SMOKE_SPACE_ID=...
export PLAKY115_SMOKE_BOARD_ID=...
npm run live:sweep
```

The script creates clearly named `smoke:` sacrificial items and comments, then
cleans them up and reports the leftover count. When SDK, CLI, or MCP sweeps are
enabled, missing builds are hard failures rather than skipped sections. A
successful sweep must complete the cleanup scan and end with leftover count `0`.

## Manual Read Checks

```bash
export PLAKY115_API_KEY=...

cd cli
go build -o plaky115 ./cmd/plaky115
./plaky115 doctor
./plaky115 raw list-users --page-size 5
./plaky115 raw list-spaces --page-size 5
./plaky115 raw list-teams --page-size 5
```

Pick the first writable `spaceId` and `boardId` from the read output:

```bash
./plaky115 raw list-boards --space-id "$SPACE_ID" --page-size 5
./plaky115 raw list-items --space-id "$SPACE_ID" --board-id "$BOARD_ID" --page-size 5
./plaky115 workspace-map
```

## Manual Write Checks

Only run these in a workspace where sacrificial data is allowed. Start with
dry-run plans:

```bash
TITLE="plaky115 smoke $(date +%Y%m%d-%H%M%S)"
./plaky115 items-create-simple \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --title "$TITLE" \
  --dry-run
```

Remove `--dry-run` only in a sacrificial workspace. Capture the created item ID
from the response, then:

```bash
./plaky115 comments-add \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --item-id "$ITEM_ID" \
  --text "plaky115 smoke comment" \
  --dry-run

cat > /tmp/plaky115-updates.json <<JSON
[
  {
    "spaceId": "$SPACE_ID",
    "boardId": "$BOARD_ID",
    "itemId": "$ITEM_ID",
    "body": { "fields": { "Status": "Done" } }
  }
]
JSON

./plaky115 items-bulk-update --file /tmp/plaky115-updates.json --dry-run
```

After confirming the IDs are sacrificial, clean up with the raw delete command:

```bash
./plaky115 raw delete-item \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --item-id "$ITEM_ID"
```

Rotate the API key after smoke testing if the key was exposed outside an
approved secret store.
