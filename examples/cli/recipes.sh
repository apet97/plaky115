#!/usr/bin/env bash
# Read-only and dry-run CLI recipes. The CLI reads PLAKY115_API_KEY from the
# environment; never pass the key on the command line where it can be logged.
#
#   export PLAKY115_API_KEY=...
#   export PLAKY115_SPACE_ID=...   # for board/item recipes
#   export PLAKY115_BOARD_ID=...   # for item recipes
#   # Real workspaces are account-prefixed; set when the generic host does not route:
#   export PLAKY115_BASE_URL=https://<account>.api.plaky.com
#
# Build the CLI first, then run:  PATH="/tmp:$PATH" bash cli/recipes.sh
set -euo pipefail

: "${PLAKY115_API_KEY:?Set PLAKY115_API_KEY}"

# Account-prefixed host support: pass --server-url only when PLAKY115_BASE_URL is set.
SERVER_ARGS=()
if [ -n "${PLAKY115_BASE_URL:-}" ]; then
  SERVER_ARGS=(--server-url "$PLAKY115_BASE_URL")
fi

echo "## doctor (config)"
plaky115 "${SERVER_ARGS[@]}" doctor

echo "## workspace-map (spaces with boards)"
plaky115 "${SERVER_ARGS[@]}" workspace-map

if [ -n "${PLAKY115_SPACE_ID:-}" ] && [ -n "${PLAKY115_BOARD_ID:-}" ]; then
  echo "## find items by text"
  plaky115 "${SERVER_ARGS[@]}" find --type item \
    --space-id "$PLAKY115_SPACE_ID" --board-id "$PLAKY115_BOARD_ID" --query "smoke"

  echo "## fields-list"
  plaky115 "${SERVER_ARGS[@]}" fields-list \
    --space-id "$PLAKY115_SPACE_ID" --board-id "$PLAKY115_BOARD_ID"

  echo "## items-export as JSONL"
  plaky115 "${SERVER_ARGS[@]}" items-export \
    --space-id "$PLAKY115_SPACE_ID" --board-id "$PLAKY115_BOARD_ID" --format jsonl

  echo "## comments-add (dry-run; writes nothing)"
  plaky115 "${SERVER_ARGS[@]}" comments-add \
    --space-id "$PLAKY115_SPACE_ID" --board-id "$PLAKY115_BOARD_ID" \
    --item-id 1 --text "Note" --dry-run
else
  echo "(set PLAKY115_SPACE_ID and PLAKY115_BOARD_ID for board/item recipes)"
fi
