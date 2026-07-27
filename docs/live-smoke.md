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
export PLAKY115_SMOKE_ALLOW_ARCHIVE=1
npm run live:sweep
```

`PLAKY115_SMOKE_ALLOW_ARCHIVE=1` is an explicit acknowledgement that the sweep
will create, archive, and then delete one empty run-owned group per enabled
surface. Plaky has no public unarchive endpoint. Use only a sacrificial board,
and do not start another run if deletion of an archived group reports an exact
artifact ID; remove that artifact first.

The API, SDK, CLI, and MCP sections each cover Item Group list/get/create/update/
archive/delete plus item-file upload/list/get/download/update/delete. The upload
fixture is a short in-memory text value. Raw API, SDK, and CLI file listings must
remain arrays; MCP returns its documented structured `data` envelope. Download
links are validated in memory as non-empty HTTPS URLs with numeric expiry, but
only `urlPresent: true` and the expiry are included in the summary.

Preflight validates the key presence, numeric space/board IDs, archive
acknowledgement, and every enabled SDK/CLI/MCP build before the first API
mutation. A failed preflight exits without creating remote data. The final
stdout line is one JSON object: each operation contains a fixed surface,
operation, and status plus numeric counts/IDs and booleans only. Workspace
titles, names, comments, file content, email addresses, response bodies, API
keys, and signed URLs are not serialized. Failure output is also JSON and
contains only `status`, an HTTP status when known, and the exact numeric
artifact ID when manual cleanup is required.

The script creates one UUID per run and prefixes every artifact with the exact
marker `smoke:plaky115:<uuid>:`. Its in-memory ledger records each created group,
item, comment, and file by surface, operation, and ID. Cleanup deletes known
children before parents, scans every listable resource family to recover a
create response that was lost, and performs a final rescan. It never deletes a
generic `smoke:` prefix or an artifact owned by another run.

When SDK, CLI, or MCP sweeps are enabled, missing builds are hard failures rather
than skipped sections. GitHub Actions serializes runs targeting the same
space/board without cancelling a run during cleanup; different targets remain
independent. SIGINT and SIGTERM share the same in-flight cleanup promise and do
not exit until it settles. Cleanup treats HTTP 404 as already absent, continues
after other failures, exhausts pagination, and fails if the final rescan finds a
leftover. A successful sweep ends with zero artifacts for its exact run marker.

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
  --item-id "$ITEM_ID" \
  --confirm
```

Rotate the API key after smoke testing if the key was exposed outside an
approved secret store.
