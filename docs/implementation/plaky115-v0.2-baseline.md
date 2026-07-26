# Plaky115 v0.2.0 baseline

Captured at `2026-07-26T21:21:22Z` from repository baseline `74eee9a96c239ad03691bbc4fc85cef5bc268b16` on the implementation branch. This is the intentional pre-v0.2 **20-operation** state, not the 32-operation target.

## Toolchain

| Tool | Observed version | Availability |
|---|---|---|
| Node.js | `v26.0.0` | global |
| npm | `11.12.1` | global |
| Go | `go1.26.2 darwin/arm64` | global |
| Ruby | `2.6.10p210` | global |
| Bun | `1.2.17` | package-local through `mcp-server/node_modules/.bin`; not global |
| GoReleaser | `2.15.2` | global |

Both npm package dependency trees and the Go module cache were already present. SDK and MCP package versions were `0.1.0`; both declared Node.js `>=22.12`.

## Contract inventory

`npm run contract:inventory` reported:

- operations: 20;
- unique operation IDs: 20;
- unique method/path keys: 20;
- mutations: 8;
- destructive operations: 2;
- generated raw CLI operation files: 20;
- generated raw MCP operation files: 20.

The operation IDs were `createItem`, `createItemComment`, `deleteItem`, `deleteItemComment`, `getBoard`, `getCurrentUser`, `getItem`, `getSpace`, `getTeam`, `listBoards`, `listItemComments`, `listItems`, `listSpaces`, `listSubitems`, `listTeams`, `listUsers`, `replaceCommentReactions`, `updateItemComment`, `updateItemField`, and `updateItemFields`.

Two inventories produced byte-identical 1,872-byte JSON output. The inventory test also proved duplicate operation IDs and duplicate method/path keys are rejected.

## Baseline gates

| Command | Exit | Outcome |
|---|---:|---|
| `node --test scripts/test-contract-inventory.mjs` | 0 | 3 tests passed |
| `npm run contract:inventory` | 0 | deterministic 20-operation inventory |
| `npm run overlay:validate` | 0 | overlay check passed |
| `npm run lint:openapi` | 0 | OpenAPI lint passed |
| `npm run openapi:test` | 0 | 12 tests and 40 assertions passed |
| `npm run metadata:test` | 0 | 4 tests and 158 assertions passed |
| `npm run test:surfaces` | 0 | 3 tests passed |
| `npm run examples:check` | 0 | all SDK and CLI examples passed syntax checks |
| `npm run live:sweep:test` | 0 | 4 source-guard tests passed |
| `npm run secret:scan` | 0 | no finding under the baseline scanner |
| `npm run status:surfaces:strict` | 0 | all 20-operation surfaces fresh |
| `npm run verify` | 0 | complete offline gate passed, including SDK 126 tests, MCP 30 tests, Go tests/build, 21 parity tests, package/consumer smoke, drift checks, secret scan, and GoReleaser validation |

This is a real Git checkout, so the `.git`-dependent docs surface test ran and passed. The archive-only `.git` limitation from the supplied static validation does not apply here.

## Intentionally unrun external gates

- `npm run contract:fetch-candidate`: not implemented at this baseline and requires network access.
- Official rendered-documentation freshness comparison: deferred to the contract-acquisition phase.
- `npm run live:sweep`: not a baseline static gate; sacrificial credentials/IDs and preflight are required before mutation.
- npm trusted-publisher validation, package publication, tags, and GitHub releases: release-phase external hold points; no publication or release action was performed.
