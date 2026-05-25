# Release Checklist

Run from a clean worktree on the release branch.

## Local deterministic gates (must all pass)

```bash
npm run overlay:validate
npm run overlay:apply
npm run lint:openapi
npm run metadata:generate
npm run metadata:test
npm run generate:all
git diff --exit-code

node scripts/postgen-dx.mjs
git diff --exit-code -- sdk/package.json mcp-server/package.json

npm run test:surfaces
npm run status:surfaces
npm run artifacts:audit
npm run pack:smoke

npm --prefix sdk test
npm --prefix mcp-server test
(cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115)

node --test scripts/test-surface-audit.mjs scripts/test-codegen-determinism.mjs scripts/test-postgen-determinism.mjs

npm run secret:scan
npm run goreleaser:check
```

## Optional live gate

```bash
PLAKY115_API_KEY=… npm run live:sweep
npm run secret:scan
```

Never store the key in `.env`, `~/.zshrc`, or any committed file.

## Strict surface gate (before tagging)

```bash
npm run status:surfaces:strict
```

Passes when no surface reports `legacy`.

## Tag + publish

1. Bump versions:
   - `sdk/package.json` and `mcp-server/package.json` — bump matching MAJOR.MINOR.PATCH.
   - `cli/internal/cli/version.go` if reintroduced.
2. Update CHANGELOG with curated diff highlights.
3. Tag `git tag v0.X.Y && git push --tags`.
4. `npm publish --workspace sdk` and `npm publish --workspace mcp-server` (or per-package).
5. `goreleaser release --clean` for the Go CLI.

## Post-release smoke

```bash
npx plaky115-mcp --help
npx plaky115-cli --help
```

## Secret hygiene

- Rotate any API key that appears in a shell history, chat log, or backup.
- `secret:scan` enforces no `plk_…` literal anywhere in the repo.
