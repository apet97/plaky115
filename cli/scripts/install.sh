#!/usr/bin/env bash
set -euo pipefail

REPO="apet97/plaky115"
BINARY_NAME="plaky115"
VERSION="${PLAKY115_VERSION:-latest}"
INSTALL_DIR="${PLAKY115_INSTALL_DIR:-}"
TEST_BASE_URL="${PLAKY115_INSTALL_TEST_BASE_URL:-}"

fail() { printf 'plaky115 installer: %s\n' "$*" >&2; exit 1; }
download() {
    if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
    elif command -v wget >/dev/null 2>&1; then wget -qO "$2" "$1"
    else fail "curl or wget is required"
    fi
}

case "$(uname -s)" in Linux) os=Linux ;; Darwin) os=Darwin ;; *) fail "unsupported operating system" ;; esac
case "$(uname -m)" in x86_64|amd64) arch=x86_64 ;; aarch64|arm64) arch=arm64 ;; *) fail "unsupported architecture" ;; esac

if [ "$VERSION" = latest ]; then
    latest_file="$(mktemp)"
    trap 'rm -f "$latest_file"' EXIT HUP INT TERM
    download "https://api.github.com/repos/${REPO}/releases/latest" "$latest_file"
    VERSION="$(sed -nE 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$latest_file" | head -n 1)"
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
    [ "${PLAKY115_INSTALL_TESTING:-}" = 1 ] || fail "test base URL is disabled"
    release_base="${TEST_BASE_URL%/}/${VERSION}"
else
    release_base="https://github.com/${REPO}/releases/download/${VERSION}"
fi
archive_name="${BINARY_NAME}_${os}_${arch}.tar.gz"

tmp_dir="$(mktemp -d)"
candidate=""
cleanup() { rm -rf "$tmp_dir"; [ -z "$candidate" ] || rm -f "$candidate"; }
trap cleanup EXIT HUP INT TERM
download "${release_base}/${archive_name}" "$tmp_dir/$archive_name" || fail "archive download failed"
download "${release_base}/checksums.txt" "$tmp_dir/checksums.txt" || fail "checksum download failed"

matches="$(awk -v name="$archive_name" '$2 == name || $2 == "*" name { print $1 }' "$tmp_dir/checksums.txt")"
count="$(printf '%s\n' "$matches" | awk 'NF { n++ } END { print n+0 }')"
[ "$count" -eq 1 ] || fail "checksums.txt must contain exactly one entry for $archive_name"
expected="$(printf '%s\n' "$matches" | head -n 1)"
case "$expected" in *[!0-9A-Fa-f]*|'') fail "invalid SHA-256 checksum" ;; esac
[ "${#expected}" -eq 64 ] || fail "invalid SHA-256 checksum"
if command -v sha256sum >/dev/null 2>&1; then
    (cd "$tmp_dir" && printf '%s  %s\n' "$expected" "$archive_name" | sha256sum -c - >/dev/null) || fail "checksum mismatch"
elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$tmp_dir/$archive_name" | awk '{print $1}')"
    [ "$actual" = "$expected" ] || fail "checksum mismatch"
else
    fail "sha256sum or shasum is required"
fi

entries="$(tar -tzf "$tmp_dir/$archive_name")" || fail "invalid archive"
printf '%s\n' "$entries" | while IFS= read -r entry; do
    case "$entry" in /*|..|../*|*/../*) fail "archive contains an unsafe path" ;; esac
done
binary_count="$(printf '%s\n' "$entries" | awk -v name="$BINARY_NAME" '$0 == name { n++ } END { print n+0 }')"
[ "$binary_count" -eq 1 ] || fail "archive must contain exactly one $BINARY_NAME binary"
tar -xzf "$tmp_dir/$archive_name" -C "$tmp_dir" -- "$BINARY_NAME" || fail "binary extraction failed"
[ -f "$tmp_dir/$BINARY_NAME" ] && [ ! -L "$tmp_dir/$BINARY_NAME" ] || fail "archive binary is not a regular file"

if [ -z "$INSTALL_DIR" ]; then
    if [ -w /usr/local/bin ]; then INSTALL_DIR=/usr/local/bin; else INSTALL_DIR="$HOME/.local/bin"; fi
fi
mkdir -p "$INSTALL_DIR" || fail "cannot create install directory"
candidate="$INSTALL_DIR/.${BINARY_NAME}.new.$$"
install -m 0755 "$tmp_dir/$BINARY_NAME" "$candidate" || fail "cannot stage binary"
mv -f "$candidate" "$INSTALL_DIR/$BINARY_NAME" || fail "cannot replace binary"
candidate=""
printf 'plaky115 %s installed to %s\n' "$VERSION" "$INSTALL_DIR/$BINARY_NAME"
