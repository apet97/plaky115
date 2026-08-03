# Plaky115

[![CI](https://github.com/apet97/plaky115/actions/workflows/ci.yml/badge.svg)](https://github.com/apet97/plaky115/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/apet97/plaky115?display_name=tag&sort=semver)](https://github.com/apet97/plaky115/releases)
[![SDK on npm](https://img.shields.io/npm/v/plaky115?label=SDK)](https://www.npmjs.com/package/plaky115)
[![MCP on npm](https://img.shields.io/npm/v/plaky115-mcp?label=MCP)](https://www.npmjs.com/package/plaky115-mcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js >=22.12](https://img.shields.io/badge/node-%3E%3D22.12-339933?logo=node.js&logoColor=white)](sdk/package.json)
[![Go 1.26](https://img.shields.io/badge/go-1.26-00ADD8?logo=go&logoColor=white)](cli/go.mod)

One repository for working with the Plaky public API from TypeScript, a terminal,
or an MCP host.

| Surface | Package | Best for |
| --- | --- | --- |
| TypeScript SDK | [`plaky115`](sdk/README.md) | Typed applications, scripts, pagination, and workflows |
| Go CLI | [`plaky115`](cli/README.md) | Shell automation, exports, diagnostics, and exact raw commands |
| MCP server | [`plaky115-mcp`](mcp-server/README.md) | Claude, Cursor, and other MCP clients with safe defaults |

> [!IMPORTANT]
> Plaky115 is unofficial and independent. It is not affiliated with, endorsed by,
> or sponsored by Plaky or CAKE.com. “Plaky” and “CAKE.com” are trademarks of
> their respective owners.

## Quick start

### TypeScript SDK

```bash
npm install plaky115
```

```ts
import { PlakyClient } from "plaky115";

const plaky = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
});

for await (const space of plaky.spaces.iterate({ pageSize: 100 })) {
  console.log(space.id, space.title);
}
```

See the [SDK guide](sdk/README.md) for resources, pagination, errors, retries,
uploads, typed IDs, interceptors, and workflow helpers.

### Go CLI

macOS or Linux:

```bash
version=v1.0.1
curl -fsSLo install-plaky115.sh "https://raw.githubusercontent.com/apet97/plaky115/${version}/cli/scripts/install.sh"
less install-plaky115.sh
PLAKY115_VERSION="$version" bash install-plaky115.sh
rm install-plaky115.sh
```

Windows PowerShell:

```powershell
$version = "v1.0.1"
Invoke-WebRequest "https://raw.githubusercontent.com/apet97/plaky115/$version/cli/scripts/install.ps1" -OutFile install-plaky115.ps1
Get-Content install-plaky115.ps1
$env:PLAKY115_VERSION = $version
./install-plaky115.ps1
Remove-Item install-plaky115.ps1
```

```bash
export PLAKY115_API_KEY=...
plaky115 doctor
plaky115 workspace-map
plaky115 find --type item --space-id 123 --board-id 456 --query "invoice"
```

See the [CLI guide](cli/README.md) for curated workflows, file uploads, CSV
exports, dry runs, and all 32 raw commands.

### MCP server

```bash
npx --yes plaky115-mcp --help
```

```json
{
  "mcpServers": {
    "plaky115": {
      "command": "npx",
      "args": ["--yes", "plaky115-mcp"],
      "env": { "PLAKY115_API_KEY": "set-in-your-secret-store" }
    }
  }
}
```

The default is equivalent to curated tools with read scope. Raw, write, and
destructive tools must be enabled explicitly. Uploads accept base64 content plus
metadata and never arbitrary local filesystem paths. See the [MCP guide](mcp-server/README.md)
and [client installation snippets](docs/install-snippets.md).

## What ships

- Exact raw coverage for all **32 public operations** across CLI and MCP.
- Hand-written, resource-oriented `PlakyClient` methods with generated schema
  types as type-only escape hatches.
- Item Group and item-file lifecycle support across SDK, CLI, and MCP.
- Page helpers, `listAll`, async iterators, detailed item search, and
  deterministic spreadsheet-safe CSV export.
- Typed API, timeout, abort, connection, and decode errors.
- Request/response metadata, rate-limit snapshots, custom fetch and headers,
  cancellation, and interceptors.
- Curated CLI and MCP workflows alongside exact operation-shaped raw surfaces.
- Deterministic local code generation, package-content snapshots, consumer
  smoke tests, secret scanning, and release provenance checks.

Only `GET` requests can retry. Writes remain single-attempt even when an
idempotency key is present. Callers may attach an explicit key, but the public
Plaky contract does not promise write deduplication.

## Configuration

The tools read `PLAKY115_API_KEY`; `PLAKY115_API_KEY_AUTH` is a compatibility
fallback. Never commit keys or paste them into logs.

The default API host is `https://api.plaky.com`. If a workspace requires its
account-prefixed host, configure `https://<account>.api.plaky.com`:

- SDK: `new PlakyClient({ apiKey, serverURL })`
- CLI: `plaky115 --server-url https://<account>.api.plaky.com ...`
- MCP/live sweep: `PLAKY115_BASE_URL=https://<account>.api.plaky.com`

The API is page-based. `page` and `pageSize` are server parameters; SDK iterator
`limit` is a client-side yield cap. See [verified API behavior](docs/api-behavior.md).

## Surface map

```text
api-1.yaml + overlays/
        │
        ├── generated schema types
        ├── generated CLI raw commands + Go request helpers
        └── generated MCP raw tools

hand-written SDK resources ── curated CLI commands ── curated MCP workflows
```

Generated artifacts are built locally and checked for deterministic drift. The
SDK runtime, resource methods, curated commands, workflows, pagination, and
error behavior remain hand-written and reviewable. See [surface ownership](docs/surfaces.md)
and [code generation](docs/codegen.md).

## Documentation

| Audience | Guide |
| --- | --- |
| SDK users | [TypeScript SDK](sdk/README.md) |
| CLI users | [Go CLI](cli/README.md) |
| MCP users | [MCP server](mcp-server/README.md), [host snippets](docs/install-snippets.md), [recipes](examples/mcp/recipes.md) |
| API behavior | [Verified wire behavior](docs/api-behavior.md) |
| Contributors | [Contributing](CONTRIBUTING.md), [API evolution](docs/api-evolution.md), [codegen](docs/codegen.md) |
| Security | [Security policy](SECURITY.md) |
| Maintainers | [Release checklist](docs/release-checklist.md), [action pin provenance](docs/release/action-pins.md) |
| History | [Changelog](CHANGELOG.md) |

Runnable, secret-free examples live in [`examples/`](examples/README.md).

## Development

Requirements: Node.js `>=22.12`, Bun `1.2.17`, Go `1.26.x`, Ruby `3.3`, and
GoReleaser for release validation.

```bash
npm --prefix sdk ci
npm --prefix mcp-server ci
(cd cli && go mod download)
npm run verify
```

`npm run verify` covers OpenAPI/metadata validation, deterministic generation,
SDK/MCP lint and tests, Go tests/build, 32-operation parity, package audits,
consumer installation, secret scanning, and GoReleaser configuration.

For a focused documentation or package-surface check, run
`npm run docs:surface:test && npm run examples:check && npm run artifacts:audit`.
`npm run audit:production` checks published runtime dependencies; a full npm
audit also includes development-only generator and test tooling. Run
`npm run audit:all` to check both package dependency trees.

See [CONTRIBUTING.md](CONTRIBUTING.md) before changing generated surfaces or
public contracts.

## Live smoke

For GET-only proof, inject a rotated key securely, build the SDK, and run
`npm --prefix sdk run build && npm run live:read`. It does not create or modify
workspace data.

Use only an explicitly sacrificial workspace:

```bash
export PLAKY115_API_KEY=...
export PLAKY115_SMOKE_SPACE_ID=...
export PLAKY115_SMOKE_BOARD_ID=...
export PLAKY115_SMOKE_ALLOW_ARCHIVE=1
npm run live:sweep
```

The sweep runs API, SDK, CLI, and MCP probes with one UUID-scoped marker. It
must finish with zero discovered leftovers and zero tracked artifacts. Archive
acknowledgement is mandatory because the public API has no unarchive endpoint.
Read [the live-smoke contract](docs/live-smoke.md) first.

## Security and support

Report vulnerabilities through GitHub Security Advisories. Never include API
keys, signed download URLs, or real workspace data. See [SECURITY.md](SECURITY.md).

For API behavior questions or reproducible defects, open a GitHub issue with the
affected surface, version, minimal secret-free example, and observed response.

## License

[MIT](LICENSE). Published npm packages include the license text.
