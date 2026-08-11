#!/usr/bin/env bash
set -euo pipefail

REPO="apet97/plaky115"
BINARY_NAME="plaky115"
VERSION="${PLAKY115_VERSION:-latest}"
INSTALL_DIR="${PLAKY115_INSTALL_DIR:-}"
TEST_BASE_URL="${PLAKY115_INSTALL_TEST_BASE_URL:-}"
TESTING="${PLAKY115_INSTALL_TESTING:-}"

METADATA_MAX_BYTES=$((1 * 1024 * 1024))
ARCHIVE_MAX_BYTES=$((256 * 1024 * 1024))
MAX_ENTRIES=32
MAX_ENTRY_BYTES=$((256 * 1024 * 1024))
MAX_REDIRECTS=5
CONNECT_TIMEOUT=10
TOTAL_TIMEOUT=120

latest_file=""
tmp_dir=""
candidate=""
backup=""
backup_preserved=0

fail() { printf 'plaky115 installer: %s\n' "$*" >&2; exit 1; }

assert_file_size() {
    local path="$1" max="$2" actual
    actual="$(wc -c < "$path" | tr -d ' ')"
    [[ "$actual" =~ ^[0-9]+$ ]] || fail "download size could not be measured"
    [ "$actual" -le "$max" ] || fail "download exceeds the size limit"
}

download() {
    local url="$1" destination="$2" max_bytes="$3"
    case "$url" in
        file://*)
            [ "$TESTING" = 1 ] || fail "file URLs are disabled"
            cp -- "${url#file://}" "$destination" 2>/dev/null || fail "download failed"
            ;;
        https://*)
            if command -v curl >/dev/null 2>&1; then
                curl --proto '=https' --proto-redir '=https' --tlsv1.2 --location --max-redirs "$MAX_REDIRECTS" \
                    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$TOTAL_TIMEOUT" --fail --silent --show-error \
                    --max-filesize "$max_bytes" "$url" -o "$destination" 2>/dev/null || fail "download failed"
            elif command -v wget >/dev/null 2>&1; then
                wget --https-only --max-redirect="$MAX_REDIRECTS" --timeout="$CONNECT_TIMEOUT" --read-timeout="$TOTAL_TIMEOUT" \
                    --tries=1 --quiet --output-document="$destination" "$url" 2>/dev/null || fail "download failed"
            else
                fail "curl or wget is required"
            fi
            ;;
        http://127.0.0.1:*|http://localhost:*)
            [ "$TESTING" = 1 ] || fail "HTTP is disabled"
            command -v curl >/dev/null 2>&1 || fail "curl is required for test downloads"
            curl --location --max-redirs "$MAX_REDIRECTS" --connect-timeout "$CONNECT_TIMEOUT" --max-time "$TOTAL_TIMEOUT" \
                --fail --silent --show-error --max-filesize "$max_bytes" "$url" -o "$destination" 2>/dev/null || fail "download failed"
            ;;
        *) fail "download protocol is not allowed" ;;
    esac
    assert_file_size "$destination" "$max_bytes"
}

case "$(uname -s)" in Linux) os=Linux ;; Darwin) os=Darwin ;; *) fail "unsupported operating system" ;; esac
case "$(uname -m)" in x86_64|amd64) arch=x86_64 ;; aarch64|arm64) arch=arm64 ;; *) fail "unsupported architecture" ;; esac

if [ "$VERSION" = latest ]; then
    latest_file="$(mktemp)"
    download "https://api.github.com/repos/${REPO}/releases/latest" "$latest_file" "$METADATA_MAX_BYTES"
    VERSION="$(sed -nE 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$latest_file" | head -n 1)"
    [ -n "$VERSION" ] || fail "latest release metadata is invalid"
fi
if ! [[ "$VERSION" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$ ]]; then
    fail "version must be an exact v<semver> tag"
fi
if [[ "$VERSION" == *-* ]]; then
    prerelease="${VERSION#*-}"
    prerelease="${prerelease%%+*}"
    IFS=. read -r -a identifiers <<< "$prerelease"
    for identifier in "${identifiers[@]}"; do
        [[ "$identifier" =~ ^0[0-9]+$ ]] && fail "version must be an exact v<semver> tag"
    done
fi

if [ -n "$TEST_BASE_URL" ]; then
    [ "$TESTING" = 1 ] || fail "test base URL is disabled"
    case "$TEST_BASE_URL" in file://*|http://127.0.0.1:*|http://localhost:*) ;; *) fail "test base URL is not allowed" ;; esac
    release_base="${TEST_BASE_URL%/}/${VERSION}"
else
    release_base="https://github.com/${REPO}/releases/download/${VERSION}"
fi
archive_name="${BINARY_NAME}_${os}_${arch}.tar.gz"

tmp_dir="$(mktemp -d)"
cleanup() {
    [ -z "$latest_file" ] || rm -f "$latest_file"
    [ -z "$candidate" ] || rm -f "$candidate"
    if [ "$backup_preserved" -eq 0 ] && [ -n "$backup" ]; then rm -f "$backup"; fi
    [ -z "$tmp_dir" ] || rm -rf "$tmp_dir"
}
trap cleanup EXIT HUP INT TERM

download "${release_base}/${archive_name}" "$tmp_dir/$archive_name" "$ARCHIVE_MAX_BYTES"
download "${release_base}/checksums.txt" "$tmp_dir/checksums.txt" "$METADATA_MAX_BYTES"

matches="$(awk -v name="$archive_name" '$2 == name || $2 == "*" name { print $1 }' "$tmp_dir/checksums.txt")"
count="$(printf '%s\n' "$matches" | awk 'NF { n++ } END { print n+0 }')"
[ "$count" -eq 1 ] || fail "checksums.txt must contain exactly one entry for $archive_name"
expected="$(printf '%s\n' "$matches" | head -n 1)"
case "$expected" in *[!0-9A-Fa-f]*|'') fail "invalid SHA-256 checksum" ;; esac
[ "${#expected}" -eq 64 ] || fail "invalid SHA-256 checksum"
if command -v sha256sum >/dev/null 2>&1; then
    (cd "$tmp_dir" && printf '%s  %s\n' "$expected" "$archive_name" | sha256sum -c - >/dev/null 2>/dev/null) || fail "checksum mismatch"
elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$tmp_dir/$archive_name" | awk '{print $1}')"
    [ "$actual" = "$expected" ] || fail "checksum mismatch"
else
    fail "sha256sum or shasum is required"
fi

entries="$(tar -tzf "$tmp_dir/$archive_name")" || fail "invalid archive"
entry_count="$(printf '%s\n' "$entries" | awk 'NF { n++ } END { print n+0 }')"
[ "$entry_count" -le "$MAX_ENTRIES" ] || fail "archive contains too many entries"
duplicates="$(printf '%s\n' "$entries" | sort | uniq -d)"
[ -z "$duplicates" ] || fail "archive contains duplicate entries"
while IFS= read -r entry; do
    case "$entry" in
        ""|/*|../*|*/../*|*/..|.|./*|*\\*) fail "archive contains an unsafe path" ;;
    esac
done <<< "$entries"

verbose_entries="$(tar -tvzf "$tmp_dir/$archive_name")" || fail "invalid archive"
while IFS= read -r line; do
    [ -n "$line" ] || continue
    type="${line%"${line#?}"}"
    [ "$type" = "-" ] || fail "archive contains a non-regular entry"
done <<< "$verbose_entries"

binary_count="$(printf '%s\n' "$entries" | awk -v name="$BINARY_NAME" '$0 == name { n++ } END { print n+0 }')"
[ "$binary_count" -eq 1 ] || fail "archive must contain exactly one $BINARY_NAME binary"
tar -xzf "$tmp_dir/$archive_name" -C "$tmp_dir" -- "$BINARY_NAME" 2>/dev/null || fail "binary extraction failed"
[ -f "$tmp_dir/$BINARY_NAME" ] && [ ! -L "$tmp_dir/$BINARY_NAME" ] || fail "archive binary is not a regular file"
assert_file_size "$tmp_dir/$BINARY_NAME" "$MAX_ENTRY_BYTES"

if [ -z "$INSTALL_DIR" ]; then
    if [ -w /usr/local/bin ]; then INSTALL_DIR=/usr/local/bin; else INSTALL_DIR="${HOME}/.local/bin"; fi
fi
mkdir -p "$INSTALL_DIR" || fail "cannot create install directory"
target="$INSTALL_DIR/$BINARY_NAME"
candidate="$INSTALL_DIR/.${BINARY_NAME}.new.$$"
backup="$INSTALL_DIR/.${BINARY_NAME}.backup.$$"
install -m 0755 "$tmp_dir/$BINARY_NAME" "$candidate" || fail "cannot stage binary"

restore_previous() {
    [ -z "$backup" ] && return 0
    if [ "$TESTING" = 1 ] && [ "${PLAKY115_INSTALL_TEST_FAIL_RESTORE:-}" = 1 ]; then
        backup_preserved=1
        return 1
    fi
    if [ -e "$target" ] || [ -L "$target" ]; then rm -f "$target" || { backup_preserved=1; return 1; }; fi
    if mv "$backup" "$target" 2>/dev/null; then
        backup=""
        return 0
    fi
    backup_preserved=1
    return 1
}

if [ -e "$target" ] || [ -L "$target" ]; then
    mv "$target" "$backup" 2>/dev/null || fail "cannot stage existing binary for recovery"
fi
replacement_failed=0
if [ "$TESTING" = 1 ] && [ "${PLAKY115_INSTALL_TEST_FAIL_REPLACE:-}" = 1 ]; then
    replacement_failed=1
elif ! mv "$candidate" "$target" 2>/dev/null; then
    replacement_failed=1
else
    candidate=""
fi

if [ "$replacement_failed" -eq 1 ] || [ ! -f "$target" ] || [ -L "$target" ]; then
    if restore_previous; then
        fail "replacement failed; previous binary was restored"
    else
        fail "replacement failed; recovery backup preserved at $backup"
    fi
fi

if [ -n "$backup" ]; then
    rm -f "$backup" 2>/dev/null || { backup_preserved=1; fail "new binary installed; previous binary backup preserved at $backup"; }
    backup=""
fi
printf 'plaky115 %s installed to %s\n' "$VERSION" "$target"
