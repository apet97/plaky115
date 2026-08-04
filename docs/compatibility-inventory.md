# Public Compatibility Inventory

This is the release review index for user-visible names and bridges. Generated
operation/type inventories remain owned by `api-1.yaml`, the overlay, metadata,
and the generation scripts; they are checked by the contract and parity gates.

| Surface | Contract | Classification | Compatibility note |
| --- | --- | --- | --- |
| SDK | `PlakyClient`, resource classes, `requestWithResponse()` | unchanged | Existing imports and transport metadata remain public. |
| SDK | `plaky115/runtime/http.js` | unchanged | The documented runtime transport subpath remains exported. |
| SDK | `searchItems()` | deprecated bridge | Returns the historical matched array; use `searchItemsDetailed()` for completeness and continuation. |
| SDK | `exportItems()` and `workspaceMap()` | unchanged with bounded failure | Existing materializing helpers remain available and now fail explicitly at their hard caps. |
| SDK | chunk iterators/readers and `PageCursor` | additive | Bounded search/export consumers can resume with an exact page/index cursor. |
| SDK | generated schema types | unchanged | Generated types remain type-only; generated operation modules are not a public SDK surface. |
| CLI | existing command names and raw command names | unchanged | Raw writes still require `--body`; raw deletes still require `--confirm`. |
| CLI | `items-export` bounded page/byte flags | additive | Streaming JSONL/CSV is opt-in through the command; existing output modes remain. |
| CLI | `--api-key` | deprecated bridge | Retained through 1.x; environment or `--api-key-stdin` is preferred. |
| MCP | existing raw tool names | unchanged | Generated operation names continue to follow the accepted contract. |
| MCP | curated tool names and workflow IDs | unchanged | Workflow metadata is registry-owned; `plaky_execute_workflow` remains a deprecated compatibility tool. |
| MCP | workspace/export envelopes | additive bridge | Bounded envelopes expose `complete`/`truncated` and preserve the deprecated `value` alias where applicable. |
| Packages | SDK/MCP package names and documented subpaths | unchanged | Published package contents are snapshot-checked and consumer-installed before release. |

Future 2.0 removals require a separate breaking-change review. The 1.x bridges
listed here are covered by SDK type/consumer fixtures, CLI help/command tests,
MCP tool registration tests, and the release surface gates.
