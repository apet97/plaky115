# Live Smoke

Use only environment variables for secrets. Do not put API keys in commands,
files, screenshots, or logs.

## Read Checks

The full automated sweep covers raw API operations, SDK wrapper workflows, CLI
commands, and MCP curated/generated tools:

```bash
export PLAKY115_API_KEY=...
npm run live:sweep
```

The script creates clearly named `plaky115-live-smoke-*` sacrificial items and
comments, then cleans them up.

Manual checks:

```bash
export PLAKY115_API_KEY=...

cd cli
go build -o plaky115 ./cmd/plaky115
./plaky115 doctor
./plaky115 users get-workspace -o json
./plaky115 spaces list -o json
./plaky115 teams get-workspace -o json
```

Pick the first writable `spaceId` and `boardId` from the read output:

```bash
./plaky115 boards list --space-id "$SPACE_ID" -o json
./plaky115 items list --space-id "$SPACE_ID" --board-id "$BOARD_ID" -o json
```

## Write Checks

Only run these in a workspace where sacrificial data is allowed.

```bash
TITLE="plaky115 smoke $(date +%Y%m%d-%H%M%S)"
./plaky115 items create-simple \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --title "$TITLE" \
  --fields '{"Status":"To do"}' \
  -o json
```

Capture the created item ID from the response, then:

```bash
./plaky115 comments add \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --item-id "$ITEM_ID" \
  --text "plaky115 smoke comment" \
  -o json

./plaky115 items update-fields \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --item-id "$ITEM_ID" \
  --fields '{"Status":"Done"}' \
  -o json

./plaky115 items delete \
  --space-id "$SPACE_ID" \
  --board-id "$BOARD_ID" \
  --item-id "$ITEM_ID" \
  --dry-run
```

Remove sacrificial items only after confirming the IDs are correct. Rotate the
API key after smoke testing if the key was exposed outside an approved secret
store.
