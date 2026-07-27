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

1. Confirm `sdk/package.json` and `mcp-server/package.json` use the same version,
   then run `node scripts/check-release-version.mjs --tag vX.Y.Z --offline`.
2. Update release notes with curated diff highlights.
3. Before creating a tag, manually verify that both `plaky115` and
   `plaky115-mcp` have an npm trusted publisher configured for GitHub repository
   `apet97/plaky115`, workflow filename `release-npm.yml`, environment
   `npm-release`, and the `npm publish` permission. This exact external
   configuration is a blocking prerequisite; npm does not validate it when the
   publisher is saved.
4. Confirm the protected GitHub environment `npm-release` has the intended
   reviewer policy, then tag `git tag vX.Y.Z && git push --tags`.
5. The tag starts two root workflows. `release-npm.yml` runs the complete gates,
   checks both exact versions are absent from npm, then publishes SDK before MCP
   with OIDC trusted publishing and automatic provenance. `release-cli.yml`
   runs GoReleaser from `cli/` and attaches CLI archives to the release.
6. Confirm the CLI workflow produced matching Linux/macOS `.tar.gz` and Windows
   `.zip` archives plus `checksums.txt`. Do not rerun GoReleaser locally against
   the same tag.

Do not store a long-lived npm publishing token. If the SDK succeeds but the MCP
publish fails, never unpublish the SDK automatically. Diagnose the failure,
publish the same already-preflighted MCP version, and record the incident and
recovery evidence.

## Post-Release Smoke

```bash
npx --yes plaky115-mcp --help
plaky115 --help
```

## Secret Hygiene

- Rotate any API key that appears in a shell history, chat log, or backup.
- `secret:scan` enforces no `plk_` literal anywhere in the repo.
