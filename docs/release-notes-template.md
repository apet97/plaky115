# Plaky115 Release Notes

Plaky115 is an unofficial toolkit for the Plaky public API. It is not an
official Plaky or CAKE.com package.

## Version

`vX.Y.Z`

## Highlights

- SDK:
- CLI:
- MCP:

## Verification

- `npm run overlay:validate`
- `npm run overlay:apply`
- `npm run metadata:test`
- `npm --prefix sdk test`
- `go test ./...` from `cli/`
- `go build ./...` from `cli/`
- `npm --prefix mcp-server test`
- `npm run secret:scan`
- Optional live: `npm run live:sweep`

## Compatibility Notes

- Generated SDK/CLI/MCP operation tools remain available.
- Curated MCP tools can be selected with `mcp start --mode curated`.
- Use `includeRaw: true` only when raw Plaky API payloads are needed.
