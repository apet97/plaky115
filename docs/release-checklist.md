# Release Checklist

Run from a clean worktree on the release branch.

## Local Deterministic Gates

```bash
npm run verify
npm run audit:all
npm run govulncheck
npm run workflow:policy:test
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

The workflow-policy gate parses every root workflow, rejects mutable or short
external action references, enforces same-line version comments and least
permissions, and validates the weekly GitHub Actions Dependabot configuration.
Reviewed pin provenance is recorded in `docs/release/action-pins.md`.

## Live Gates

Run the GET-only gate with a rotated, securely injected key:

```bash
npm --prefix sdk run build
npm run live:read
```

Run the mutation gate only after separate sacrificial authorization:

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

Publishing is tag-only OIDC trusted publishing. There is no manual `npm
publish` step and no long-lived npm token.

1. Confirm `sdk/package.json` and `mcp-server/package.json` use the same version,
   then run `node scripts/check-release-version.mjs --tag vX.Y.Z --offline`.
2. Run the local release-candidate gate from a clean disposable checkout. The
   release workflow then builds once, inspects both packages, scans all extracted
   bytes, installs the exact tarballs into a clean consumer, and writes
   `.release-artifacts/release-digests.json` with SHA-256, SHA-512/SRI, and file
   inventory bindings.
3. Before creating a tag, read back the trusted publisher configuration for both
   packages and the protected `npm-release` environment. It must identify
   repository `apet97/plaky115`, workflow `release-npm.yml`, environment
   `npm-release`, and the `npm publish` permission. Set the reviewed external
   readback status to `confirmed`; unresolved readback blocks the workflow.
4. Confirm the protected GitHub environment has the intended reviewer/tag
   policy, then create and push one annotated tag:
   `git tag -a vX.Y.Z -m "Plaky115 vX.Y.Z" && git push origin vX.Y.Z`.
5. The tag starts two root workflows. Both check out `github.ref` and require
   checkout `HEAD`, the peeled tag commit, and `GITHUB_SHA` to match.
   `.github/workflows/release-npm.yml` classifies absent/exact/mismatch/ambiguous registry states,
   publishes the exact inspected SDK tarball before the exact MCP tarball, and
   verifies integrity, signature, and immutable provenance after each publish.
   `.github/workflows/release-cli.yml` runs GoReleaser from `cli/` and attaches CLI archives.
6. Confirm the CLI workflow produced matching Linux/macOS `.tar.gz` and Windows
   `.zip` archives plus `checksums.txt`. Do not rerun GoReleaser locally against
   the same tag.

If SDK publication succeeds but MCP publication fails, the state machine never
unpublishes or republishes the SDK. Resume only with the same digest manifest
after proving SDK registry integrity, package metadata, signature, provenance,
tag, commit, workflow, and environment.

## Post-Release Smoke

```bash
npx --yes plaky115-mcp --help
plaky115 --help
```

Verify each npm attestation against the immutable tag commit:

```bash
node scripts/verify-npm-attestation.mjs --package plaky115 --version X.Y.Z --tag vX.Y.Z --commit <full-tag-commit>
node scripts/verify-npm-attestation.mjs --package plaky115-mcp --version X.Y.Z --tag vX.Y.Z --commit <full-tag-commit>
```

Record the sanitized result using `docs/release-evidence-template.md`.

## Secret Hygiene

- Rotate any API key that appears in a shell history, chat log, or backup.
- `secret:scan` enforces no `plk_` literal in tracked and non-ignored repository
  files or `.live-artifacts`.
