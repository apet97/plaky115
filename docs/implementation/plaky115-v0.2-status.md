# Plaky115 v0.2.0 implementation status

- Baseline commit: `74eee9a96c239ad03691bbc4fc85cef5bc268b16`
- Branch: `feat/plaky115-32-operation-contract`
- Started UTC: `2026-07-26T21:21:22Z`
- Generated-file rule: files with `AUTO-GENERATED` headers are never hand-edited; update the owning source or generator and regenerate.
- Authoritative taskbook SHA-256: `e214c94f2523e2683445a9ba15b386f50adbec0ba956dd3aaf172f6c1389e572`
- Authoritative manifest SHA-256: `2e1015e5c76756e16162115628cb7852d8b1de94d0bc93c43282d3a804425988`

## Task ledger

- [x] `B001` | Phase 0 — Baseline | DONE | Create the branch, status ledger, and task guardrails
- [x] `B002` | Phase 0 — Baseline | DONE | Capture reproducible baseline inventory and gate results
- [x] `B003` | Phase 0 — Baseline | DONE | Add the intentional 32-operation expected manifest
- [x] `C001` | Phase 1 — Contract acquisition | DONE | Create official-source parser fixtures and a deterministic YAML helper
- [x] `C002` | Phase 1 — Contract acquisition | DONE | Implement candidate fetch, parsing, canonicalization, and provenance
- [ ] `C003` | Phase 1 — Contract acquisition | NOT STARTED | Add semantic contract diff, manifest checks, and freshness workflow
- [ ] `M001` | Phase 2 — Metadata | NOT STARTED | Create and validate transport-quadrant OpenAPI fixtures
- [ ] `M002` | Phase 2 — Metadata | NOT STARTED | Make parameter metadata contract-derived
- [ ] `M003` | Phase 2 — Metadata | NOT STARTED | Derive explicit request kind and multipart parts
- [ ] `M004` | Phase 2 — Metadata | NOT STARTED | Derive primary success status and response kind
- [ ] `M005` | Phase 2 — Metadata | NOT STARTED | Annotate the existing 20 operations with explicit semantics and regenerate rich metadata
- [ ] `G001` | Phase 3 — Generators | NOT STARTED | Add one shared metadata loader and validator for JavaScript generators
- [ ] `G002` | Phase 3 — Generators | NOT STARTED | Make MCP generator use request/success/parameter metadata
- [ ] `G003` | Phase 3 — Generators | NOT STARTED | Generate safe MCP multipart upload tools
- [ ] `G004` | Phase 3 — Generators | NOT STARTED | Make Cobra command generation transport- and confirmation-aware
- [ ] `G005` | Phase 3 — Generators | NOT STARTED | Generate Go operation methods and runner functions from one descriptor
- [ ] `G006` | Phase 3 — Generators | NOT STARTED | Delete stale outputs deterministically and make parity count dynamic
- [ ] `GO001` | Phase 4 — Go transport | NOT STARTED | Propagate body read errors and preserve generic JSON numbers
- [ ] `GO002` | Phase 4 — Go transport | NOT STARTED | Add explicit JSON/multipart body forms and streaming upload
- [ ] `GO003` | Phase 4 — Go transport | NOT STARTED | Harden Go client option and URL validation
- [ ] `O001` | Phase 5 — Official contract | NOT STARTED | Fetch and validate a current 32-operation candidate
- [ ] `O002` | Phase 5 — Official contract | NOT STARTED | Overlay all six Item Group operations against the candidate
- [ ] `O003` | Phase 5 — Official contract | NOT STARTED | Overlay all six Item file operations against the candidate
- [ ] `O004` | Phase 5 — Official contract | NOT STARTED | Accept the official candidate, regenerate all surfaces, and review the complete diff
- [ ] `S001` | Phase 6 — TypeScript SDK | NOT STARTED | Remove automatic mutation retries and resource-generated idempotency keys
- [ ] `S002` | Phase 6 — TypeScript SDK | NOT STARTED | Validate dynamic API keys and server URL at the runtime boundary
- [ ] `S003` | Phase 6 — TypeScript SDK | NOT STARTED | Add IDs/file/group shapes and correct existing generated unions
- [ ] `S004` | Phase 6 — TypeScript SDK | NOT STARTED | Implement the typed Item Groups SDK resource
- [ ] `S005` | Phase 6 — TypeScript SDK | NOT STARTED | Implement the typed Item files SDK resource
- [ ] `S006` | Phase 6 — TypeScript SDK | NOT STARTED | Lock SDK public surface, package exports, and consumer behavior
- [ ] `MCP001` | Phase 7 — MCP | NOT STARTED | Add dedicated compactors and response envelopes for new resource kinds
- [ ] `MCP002` | Phase 7 — MCP | NOT STARTED | Make modes, scopes, and argument parsing fail closed
- [ ] `MCP003` | Phase 7 — MCP | NOT STARTED | Remove private MCP SDK access and pin the dependency
- [ ] `MCP004` | Phase 7 — MCP | NOT STARTED | Replace generic workflow records with exact read/mutation schemas
- [ ] `MCP005` | Phase 7 — MCP | NOT STARTED | Standardize structured errors and sensitive-output test handling
- [ ] `CLI001` | Phase 8 — CLI | NOT STARTED | Validate all generated raw request kinds and new operation behavior
- [ ] `CLI002` | Phase 8 — CLI | NOT STARTED | Add minimal curated Item Group and Item file commands
- [ ] `CLI003` | Phase 8 — CLI | NOT STARTED | Repair monorepo CLI release and installer targets
- [ ] `SEC001` | Phase 9 — Security hygiene | NOT STARTED | Unify API-key redaction, test fixtures, and repository secret scanning
- [ ] `W001` | Phase 10 — Workflow correctness | NOT STARTED | Remove avoidable workspace-map N+1 requests and keep a fallback
- [ ] `W002` | Phase 10 — Workflow correctness | NOT STARTED | Add detailed search completeness without breaking existing callers
- [ ] `W003` | Phase 10 — Workflow correctness | NOT STARTED | Make TypeScript and Go CSV canonical, collision-free, and spreadsheet-safe
- [ ] `L001` | Phase 11 — Live proof | NOT STARTED | Refactor live sweep around a run-owned artifact ledger
- [ ] `L002` | Phase 11 — Live proof | NOT STARTED | Exercise Item Groups and Item files through API, SDK, CLI, and MCP
- [ ] `L003` | Phase 11 — Live proof | NOT STARTED | Add fault injection, privacy assertions, and strict live workflow preflight
- [ ] `R001` | Phase 12 — Release and verification | NOT STARTED | Update all documentation and examples to the implemented behavior
- [ ] `R002` | Phase 12 — Release and verification | NOT STARTED | Bump versions, synchronize runtime version, and refresh package snapshots
- [ ] `REL001` | Phase 12 — Release automation | NOT STARTED | Add tokenless npm trusted publishing with provenance and release preflights
- [ ] `SEC002` | Phase 12 — Supply-chain hardening | NOT STARTED | Pin every GitHub Action by full SHA and enforce least-privilege workflow policy
- [ ] `R003` | Phase 12 — Release and verification | NOT STARTED | Run the full offline release gate from a clean real Git checkout
- [ ] `R004` | Phase 12 — Release and verification | NOT STARTED | Run sacrificial live proof, adversarial review, and release readiness audit

## Evidence log

Evidence is appended per task with commands, exit codes, and concise outcomes. Secrets and signed URLs are never recorded.

### B001

- Branch created from baseline commit `74eee9a96c239ad03691bbc4fc85cef5bc268b16`.
- Ledger contains all 51 manifest task IDs exactly once.
- `git diff --check`: exit 0.
- The four supplied taskbook/validation inputs are preserved unchanged and locally excluded from Git status; they are not committed implementation artifacts.

### B002

- Added a deterministic offline inventory and duplicate-key guards.
- Inventory: 20 operations, 8 mutations, 2 destructive operations, 20 CLI raw files, and 20 MCP raw files.
- Two inventory runs were byte-identical.
- All packet gates exited 0; full `npm run verify` also exited 0 from this real Git checkout.
- External freshness, live mutation, and publishing gates remain intentionally unrun and are listed in the baseline document.

### B003

- Added the ordered 32-operation expected manifest and exact-set comparison command.
- Strict comparison fails during migration; `--allow-missing` is diagnostic-only.
- Current diagnostic: exactly 12 missing Item Group/file operations and 0 unexpected operations.
- Duplicate operation IDs and method/path keys fail closed.

### C001

- Fixture keys: `GET /fixture/widgets listFixtureWidgets` and `GET /fixture/widgets/{widgetId} getFixtureWidget`.
- JSON, YAML, and complete inert-HTML fixtures are semantically equal; malformed HTML has no complete assignment.
- Ruby YAML parsing disables aliases and object deserialization, validates an OpenAPI object root, and emits canonical JSON.
- Canonical JSON to deterministic UTF-8 YAML to canonical JSON round-trip was byte-identical with exactly two fake paths.

### C002

- Added direct JSON/YAML and balanced inert-HTML parsing without executing page JavaScript.
- Candidate acquisition follows redirects, times out after 30 seconds, supports `--file`, and never reads a non-2xx body.
- Each successful acquisition atomically replaces ignored `.contract-candidate/current/` with raw, canonical JSON, deterministic YAML, and provenance evidence.
- Provenance includes hashes, source/status/content type, fetch time, info, operation count, and sorted method/path keys.
- Missing any of the 12 required new method/path keys preserves evidence and returns exit code 3.
- Parser/fetch suite: 13 tests passed across JSON, YAML, HTML, escaped/braced strings, malformed input, redirect, timeout, invalid contract, atomic replacement, and hold-point behavior.
