# Compatibility

Plaky115 follows semantic versioning. Additive resources, options, tools, and
commands are compatible changes. Removing or renaming an exported SDK symbol,
CLI command/flag, MCP tool, package export, or changing an established response
shape is breaking.

## Supported toolchain

| Surface | Supported versions |
| --- | --- |
| SDK and MCP | Node.js 22.12.0, 24, and 26 |
| MCP executable build | Bun 1.2.17 |
| CLI | Go 1.26.5; Linux, macOS, and Windows on amd64/arm64 |
| Generation | Ruby 3.3 and npm 11.16.0 on the release path |
| MCP protocol library | `@modelcontextprotocol/sdk` 1.30.0 |

Security fixes target current `main`; no long-term support branch is maintained.
Deprecations remain documented for at least one stable release. CLI `--api-key`
is deprecated through 1.x and is scheduled for removal in 2.0; use the
environment or `--api-key-stdin`.

Generated raw operation names follow the accepted 32-operation contract.
Resource methods and curated workflows remain hand-written compatibility
surfaces. See `docs/codegen.md` for ownership.
