# Release Checklist

Run from a clean worktree on the release branch.

## Local Deterministic Gates

```bash
npm run verify
npm run pack:smoke
npm run secret:scan
(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)
npm run goreleaser:check
```

`npm run verify` is the offline release gate: overlay validation and OpenAPI
lint, metadata tests, deterministic generation, drift checks, SDK/MCP lint and
tests, live-sweep source guard, CLI tests/build/help/doctor, surface checks,
package artifact audit, pack smoke, package-consumer smoke, secret scan, and
GoReleaser validation.

## Optional Live Gate

```bash
PLAKY115_API_KEY=... \
PLAKY115_SMOKE_SPACE_ID=... \
PLAKY115_SMOKE_BOARD_ID=... \
PLAKY115_SMOKE_ALLOW_ARCHIVE=1 \
npm run live:sweep
npm run secret:scan
```

Never store the key in `.env`, `~/.zshrc`, or any committed file. Build the SDK
and MCP packages before running the live gate; enabled SDK, CLI, and MCP
sections fail if their build artifacts are missing. The cleanup leftover count
must come from a successful cleanup scan and be `0`. Cleanup is UUID-scoped and
run-owned; never substitute a broad title-prefix delete.

## Strict Surface Gate

```bash
npm run status:surfaces:strict
```

Passes when no generated surface reports stale, missing, or legacy output.

## Tag And Publish

1. Bump versions:
   - `sdk/package.json` and `mcp-server/package.json` must use the same version.
2. Update release notes with curated diff highlights.
3. Tag `git tag v0.X.Y && git push --tags`. The root
   `.github/workflows/release-cli.yml` workflow runs GoReleaser from `cli/` and
   attaches the CLI archives to that repository release.
4. Publish `sdk/` and `mcp-server/` from their package directories.
5. Confirm the CLI workflow produced matching Linux/macOS `.tar.gz` and Windows
   `.zip` archives plus `checksums.txt`. Do not rerun GoReleaser locally against
   the same tag.

## Post-Release Smoke

```bash
npx --yes plaky115-mcp --help
plaky115 --help
```

## Secret Hygiene

- Rotate any API key that appears in a shell history, chat log, or backup.
- `secret:scan` enforces no `plk_` literal anywhere in the repo.
