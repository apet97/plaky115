# plaky115 CLI

[![GitHub release](https://img.shields.io/github/v/release/apet97/plaky115?display_name=tag&sort=semver)](https://github.com/apet97/plaky115/releases)
[![Go 1.26](https://img.shields.io/badge/go-1.26-00ADD8?logo=go&logoColor=white)](go.mod)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)

Unofficial Go/Cobra CLI for the Plaky public API. Curated commands live at the
top level; raw OpenAPI-shaped commands live under `raw`. Not affiliated with,
endorsed by, or sponsored by Plaky or CAKE.com.

## Auth

```bash
export PLAKY115_API_KEY=...
```

`PLAKY115_API_KEY_AUTH` remains a compatibility fallback. `--api-key-stdin`
reads exactly one non-empty line for one-shot use. The legacy `--api-key` flag
is deprecated because argv may be visible in shell history and process lists;
it is retained through 1.x and scheduled for removal in 2.0. Real Plaky
workspaces are account-prefixed; pass
`--server-url https://<account>.api.plaky.com` when the default
`https://api.plaky.com` host does not route for your workspace.

## Install

Linux or macOS:

```bash
version=v1.0.0
curl -fsSLo install-plaky115.sh "https://raw.githubusercontent.com/apet97/plaky115/${version}/cli/scripts/install.sh"
less install-plaky115.sh
PLAKY115_VERSION="$version" bash install-plaky115.sh
```

Windows PowerShell:

```powershell
$version = "v1.0.0"
Invoke-WebRequest "https://raw.githubusercontent.com/apet97/plaky115/$version/cli/scripts/install.ps1" -OutFile install-plaky115.ps1
Get-Content install-plaky115.ps1
$env:PLAKY115_VERSION = $version
./install-plaky115.ps1
```

Both installers download the archive and `checksums.txt` from the same exact
release and verify SHA-256 before extraction. Set
`PLAKY115_VERSION` to a specific `v*` tag or leave it unset for the latest
release.

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

# Item Groups: exact IDs only; list drains every page.
plaky115 item-groups-list --space-id 123 --board-id 456
plaky115 item-groups-create --space-id 123 --board-id 456 --title "Backlog" --color '#5b8def' --ranking m --dry-run
plaky115 item-groups-archive --space-id 123 --board-id 456 --item-group-id 321 --dry-run
plaky115 item-groups-archive --space-id 123 --board-id 456 --item-group-id 321 --confirm

# Item files: upload streams a path or stdin; download-link returns metadata only.
plaky115 item-files-list --space-id 123 --board-id 456 --item-id 789
plaky115 item-files-upload --space-id 123 --board-id 456 --item-id 789 --file ./report.pdf --content-type application/pdf
printf 'contents' | plaky115 item-files-upload --space-id 123 --board-id 456 --item-id 789 --file - --filename note.txt --content-type text/plain
plaky115 item-files-download-link --space-id 123 --board-id 456 --item-id 789 --item-file-id 654
```

`workspace-map`, `find`, and `items-export` drain all pages instead of returning
only the first API page. `item-groups-list` also drains all pages. A real item
group archive requires `--confirm`; `--dry-run` prints its plan without writing.
File uploads are single-attempt and accept an optional explicit
`--idempotency-key`. The download-link command prints the API's short-lived URL
and expiry metadata but never follows or downloads the remote bytes; handle the
URL as a bearer capability and do not persist it in logs.

Item search accepts `--limit` (default 200) and reports `data`, `scanned`,
`matched`, `truncated`, and `nextPage` when another server page remains. CSV
export is deterministic and defaults to `--csv-safety spreadsheet`, which
neutralizes leading formula characters in string cells. Use `--csv-safety raw`
only for a trusted consumer that explicitly requires the unmodified strings.

Generated raw commands cover the remaining exact group/file operations:
`get-item-group`, `update-item-group`, `delete-item-group`, `get-item-file`,
`update-item-file`, `get-item-file-download`, and `delete-item-file`. Raw JSON
writes require `--body`; raw deletes require `--confirm`.

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
