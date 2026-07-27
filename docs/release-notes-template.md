# Plaky115 Release Notes

Plaky115 is an unofficial toolkit for the Plaky public API. It is not an
official Plaky or CAKE.com package.

## Version

`v0.2.0`

## Highlights

- SDK: adds typed Item Group and item-file resources for all twelve new
  operations, GET-only retries, detailed bounded search results, and
  deterministic spreadsheet-safe CSV export (with explicit raw opt-out).
- CLI: adds curated group/file commands, streams file/stdin uploads, requires
  confirmation for archive/delete, reports search truncation, and uses the root
  monorepo GoReleaser workflow and installers.
- MCP: adds the generated group/file raw tools, defaults to curated/read,
  accepts bounded base64 uploads without filesystem paths, and keeps signed
  download links sensitive and one-shot.

## Verification

- `npm run verify`
- `npm run secret:scan`
- `npm run pack:smoke`
- `npm run package:consumer-smoke`
- Optional live: `npm run live:sweep`

## Compatibility Notes

- Generated raw CLI/MCP operation tools remain available.
- The SDK remains schema-types-only with hand-written resource methods.
- Curated MCP tools can be selected with `mcp start --mode curated`.
- Use `includeRaw: true` only when raw Plaky API payloads are needed.
- Mutations are single-attempt even with an explicit idempotency key; the header
  is caller-managed and is not a write-deduplication guarantee.
- `item-groups-archive` requires `--confirm` outside dry-run mode.
