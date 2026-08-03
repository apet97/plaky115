# Contributing to Plaky115

Thanks for helping improve the SDK, CLI, MCP server, or contract tooling.

Plaky115 is unofficial and independent. Contributions must target the documented
public Plaky API and must not include private endpoints, credentials, or real
workspace data.

## Setup

Requirements: Node.js `>=22.12`, Bun `1.2.17`, Go `1.26.x`, Ruby `3.3`, and
GoReleaser for release checks.

```bash
git clone https://github.com/apet97/plaky115.git
cd plaky115
npm --prefix sdk ci
npm --prefix mcp-server ci
(cd cli && go mod download)
```

## Find the owner of a change

| Change | Edit first |
| --- | --- |
| API contract | `api-1.yaml`, `overlays/`, operation metadata source |
| SDK resource/runtime | `sdk/src/client/`, `sdk/src/runtime/` |
| Curated CLI | `cli/internal/cli/` |
| Curated MCP | `mcp-server/src/tools/curated/` |
| Raw CLI/MCP or Go operations | owning generator under `scripts/lib/` |
| Public docs | root/package README or focused file under `docs/` |

Never hand-edit an `AUTO-GENERATED` file. Run `npm run generate:all` after
changing its source and commit every deterministic output.

## Verification

Use focused gates while editing:

```bash
npm --prefix sdk test
npm --prefix mcp-server test
(cd cli && go test ./...)
npm run docs:surface:test
npm run codegen:test
```

Before opening a pull request, run:

```bash
npm run verify
npm run audit:all
npm run secret:scan
git diff --check
```

If package contents changed, also run `npm run packsnapshot:write` and commit
the updated `sdk/.packsnapshot` and/or `mcp-server/.packsnapshot`.

## Change rules

- Preserve stable SDK imports, CLI commands, and MCP tool names unless the
  change is intentionally breaking and documented.
- Only `GET` requests may retry automatically.
- Raw CLI writes require explicit bodies and deletes require confirmation.
- MCP write/destructive surfaces must stay opt-in and fail closed.
- Do not add package-local API-key regexes; use centralized redaction.
- Additive schema reconciliation is preferred for compatibility fields.
- Keep examples runnable, minimal, and secret-free.

## Pull requests

Describe the affected surface, behavior change, compatibility impact, and exact
commands run. Include a minimal reproduction for bug fixes. Do not paste API
keys, signed URLs, account-prefixed production hosts, or workspace content.

Generated diffs should identify their owning source. Documentation claims must
match current code and tests.

## Security reports

Do not open a public issue for a vulnerability that could expose credentials or
user data. Follow [SECURITY.md](SECURITY.md) and use GitHub Security Advisories.
