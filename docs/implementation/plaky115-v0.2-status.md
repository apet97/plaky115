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
- [x] `C003` | Phase 1 — Contract acquisition | DONE | Add semantic contract diff, manifest checks, and freshness workflow
- [x] `M001` | Phase 2 — Metadata | DONE | Create and validate transport-quadrant OpenAPI fixtures
- [x] `M002` | Phase 2 — Metadata | DONE | Make parameter metadata contract-derived
- [x] `M003` | Phase 2 — Metadata | DONE | Derive explicit request kind and multipart parts
- [x] `M004` | Phase 2 — Metadata | DONE | Derive primary success status and response kind
- [x] `M005` | Phase 2 — Metadata | DONE | Annotate the existing 20 operations with explicit semantics and regenerate rich metadata
- [x] `G001` | Phase 3 — Generators | DONE | Add one shared metadata loader and validator for JavaScript generators
- [x] `G002` | Phase 3 — Generators | DONE | Make MCP generator use request/success/parameter metadata
- [x] `G003` | Phase 3 — Generators | DONE | Generate safe MCP multipart upload tools
- [x] `G004` | Phase 3 — Generators | DONE | Make Cobra command generation transport- and confirmation-aware
- [x] `G005` | Phase 3 — Generators | DONE | Generate Go operation methods and runner functions from one descriptor
- [x] `G006` | Phase 3 — Generators | DONE | Delete stale outputs deterministically and make parity count dynamic
- [x] `GO001` | Phase 4 — Go transport | DONE | Propagate body read errors and preserve generic JSON numbers
- [x] `GO002` | Phase 4 — Go transport | DONE | Stream multipart bodies through `io.Pipe`, preserve exact JSON bytes, and propagate copy/cancellation failures
- [x] `GO003` | Phase 4 — Go transport | DONE | Validate API keys, timeouts, and absolute server URLs before use while preserving base paths and custom clients
- [x] `O001` | Phase 5 — Official contract | DONE | Fetch and validate a current 32-operation candidate
- [x] `O002` | Phase 5 — Official contract | DONE | Overlay all six Item Group operations against the candidate
- [x] `O003` | Phase 5 — Official contract | DONE | Overlay all six Item file operations against the candidate
- [x] `O004` | Phase 5 — Official contract | DONE | Accept the official candidate, regenerate all surfaces, and review the complete diff
- [x] `S001` | Phase 6 — TypeScript SDK | DONE | Remove automatic mutation retries and resource-generated idempotency keys
- [x] `S002` | Phase 6 — TypeScript SDK | DONE | Validate dynamic API keys and server URL at the runtime boundary
- [x] `S003` | Phase 6 — TypeScript SDK | DONE | Add IDs/file/group shapes and correct existing generated unions
- [x] `S004` | Phase 6 — TypeScript SDK | DONE | Implement the typed Item Groups SDK resource
- [x] `S005` | Phase 6 — TypeScript SDK | DONE | Implement the typed Item files SDK resource
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

### C003

- Added deterministic semantic diff classification for none, documentation, additive, transport, and breaking drift.
- Added explicit candidate acceptance plus offline upstream manifest hash/inventory validation; tracked contract acceptance remains deferred to O004.
- Schema and runtime validation require complete fetch and acceptance provenance.
- Added a read-only scheduled/manual freshness workflow with concurrency cancellation, ignored evidence upload, and no commit/PR/token path.
- Semantic/acceptance suite: 11 tests passed, covering descriptions, additions/removals, location, media/response kinds, required fields, enum widening/narrowing, explicit consent, hashes, expected operations, and manifest verification.

### M001

- `metadata-json.yaml`: required JSON request, object response, typed int64 path and exploded array query parameters.
- `metadata-bodyless-put.yaml`: bodyless PUT with a void 200 response.
- `metadata-multipart.yaml`: required binary multipart part with a 201 object response.
- `metadata-array.yaml`: bare JSON array response.
- Invalid fixtures independently pin ambiguous request media and incompatible success shapes.
- Fixture integrity: 6 tests and 23 assertions passed with aliases disabled and globally unique fake operation IDs.

### M002

- Metadata generation is callable and supports explicit `--source` and `--out` while preserving no-argument behavior.
- Path and nonpagination query parameters now carry contract-derived type/format/enum/default/items, required, description, style, and effective explode metadata.
- Path-item and operation parameters merge deterministically with operation-level override; local refs unescape JSON Pointers and reject cycles.
- Pagination inputs retain typed schemas outside generic parameters; unsupported query objects/deepObject fail loudly.
- Removed the positive query-name allowlist. Fixture-added `labels` appears automatically; existing `expand` comma-join and `emails` repeated-key metadata remain compatible.
- Parameter slice: 5 tests and 28 assertions passed; legacy metadata suite: 4 tests and 158 assertions passed.

### M003

- Request metadata is contract-derived as `none`, `json`, or `multipart`; bodyless PUT is explicitly `none`.
- Required/optional state, selected media type, schema ref, and primitive multipart parts are explicit.
- Multipart requires at least one binary part and rejects nested object parts; ambiguous supported media requires an overlay selection.
- The legacy `bodyRequired` field was retained temporarily during generator migration and removed from production metadata in O004.
- Request slice: 6 tests and 25 assertions passed; legacy metadata tests remain green.

### M004

- Success metadata selects an explicit overlay status or the lowest numeric 2xx and emits status, kind, media type, and source schema ref.
- No-content 200 and 204/205 are `void`; JSON arrays are `json-array`; other successful JSON schemas are `json-object`.
- Additional incompatible 2xx kinds fail without an explicit selection; compatible statuses remain deterministic.
- List classification uses pagination metadata or the selected response schema, including bare arrays, without method-specific response rules.
- Success slice: 6 tests and 26 assertions passed; bodyless archive and bare file-list fixture behavior are pinned.

### M005

- All 20 accepted operations now carry explicit confirmation, compact kind, and sensitive-output overlay fields alongside complete MCP annotations.
- Spaces map to `space`, boards to `board`, item reads/writes to `item`, comment reads/writes to `comment`, and the specified identity/reaction/delete operations to `raw`.
- Only `deleteItem` and `deleteItemComment` require destructive confirmation; all current outputs are non-sensitive.
- Generator validation rejects invalid annotations, duplicate operation IDs/MCP names, and destructive scope/confirmation inconsistencies without method/path fallbacks.
- Regenerated DX OpenAPI and rich metadata contain explicit request/success semantics for all 20 operations; metadata tests passed (legacy 4/300 assertions, rich 21/327 assertions).

### G001

- Added one non-mutating metadata loader shared by the MCP, CLI, and docs-index generator entry points.
- Validation covers required operation fields, transport/response/compaction/confirmation enums, unique operation and MCP names, typed parameters, multipart parts, and successful statuses with operation/property paths in failures.
- Optional parameter/query/pagination input collections normalize once without changing operation order.
- Loader suite: 5 tests passed, including identical entry-point rejection of malformed metadata.
- `npm run generate:docs-index` and `git diff --check` exited 0 with no generated output diff.

### G002

- MCP raw-tool generation now derives path/query Zod schemas, JSON bodies, void handling, array envelopes, and compaction directly from validated metadata.
- Removed method-based body/response rules, path-based parameter discovery, and path-based compaction selection.
- Five exact-text goldens cover typed enum/integer/array inputs, required JSON, bodyless PUT void, bare-array output, and destructive annotations.
- MCP v2 suite: 6 tests passed. The full 4-test determinism suite passed in an isolated real checkout so production generated tools remained untouched.
- `git diff --check` exited 0.

### G003

- Added a runtime-only canonical base64 decoder and single-file FormData builder with a 10 MiB default, configurable positive-integer limit, and rejecting 25 MiB hard ceiling.
- Size is estimated and rejected before decoding; filename/media type validation and the generated helper call occur before any API request.
- Multipart generation accepts only one required binary part named `file`, exposes base64/name/media-type inputs, and emits no filesystem path or JSON-body input.
- Extended MCP types for `itemGroup`, `itemFile`, `downloadLink`, and sensitive-output metadata.
- MCP build exited 0; upload suite passed 8 tests; MCP generator suite passed 8 tests; `git diff --check` exited 0.

### G004

- Cobra command generation now derives required path and typed query flags from parameter metadata, including integer/int64/string/string-array forms and enum help.
- JSON, multipart, and bodyless requests emit distinct flag sets; multipart documents stdin input and never emits `--body`.
- Destructive confirmation derives only from explicit confirmation metadata, so the bodyless archive and void delete goldens require `--confirm` while non-destructive writes do not.
- Whitespace is collapsed in generated one-line help while existing operation command names and `RunX` calls remain stable.
- CLI v2 suite: 6 exact-text/heuristic tests passed; `git diff --check` exited 0.

### G005

- Cobra flags, Go client methods/options, and `RunX` functions now derive from one operation descriptor covering parameters, request kind, response kind, and idempotency support.
- Exact Go goldens cover typed queries, JSON, bodyless void, streaming multipart, and destructive void operations; both generated files are already `gofmt`-stable.
- Reusable flag, JSON, confirmation, upload-stream, and receipt helpers moved out of the hand-written operation runners, which remain in place until O004 replaces them atomically.
- `--file -` requires a filename and never closes stdin; regular files default to their basename and are closed. No generated runner buffers upload bytes.
- Helper tests and the full CLI Go suite exited 0; CLI codegen suite passed 8 tests; `git diff --check` exited 0.

### G006

- MCP and CLI entry points now delete only stale files carrying the matching generated header and refuse to overwrite unmarked expected-name files.
- Isolated-output determinism tests prove exact metadata-derived filename sets, header-guarded cleanup, hand-written-file preservation, owned Go runner generation, and a zero-diff second run without touching production outputs.
- Drift snapshots include generated runners; surface body classification now uses request metadata.
- Cross-surface parity is metadata-count-driven, builds requests from typed request/parameter metadata, stubs responses by success kind, and invokes MCP tools through the public protocol instead of private server fields.
- Determinism/parity/surface command passed 29 tests; transport-quadrant generator suites passed 16 tests; `git diff --check` exited 0.

### GO001

- Go response reads now propagate errors with method/path operation context and never include request headers or credentials.
- Successful empty 200/204 responses and nil outputs return cleanly; API errors retain status, request ID, redacted body, and `APIError` typing.
- Response decoding uses `json.Decoder.UseNumber`, rejects a second JSON value/trailing syntax, and retains integers beyond the exact IEEE-754 range as `json.Number`; safe legacy numbers remain compatible with current CLI workflows.
- Focused client/decode tests and the full Go suite exited 0; `git diff --check` exited 0.

### GO002

- Go requests now distinguish JSON from multipart bodies and reject ambiguous combinations before transport.
- JSON bodies retain the exact `json.Marshal` bytes and content type; bodyless requests emit neither a body nor `Content-Type`.
- Multipart uploads stream through `io.Pipe` with explicit part name, filename, media type, and source reader; copy and cancellation errors reach the caller.
- Focused JSON/multipart tests and `go test -race ./internal/plakysdk` exited 0; `git diff --check` exited 0.

### GO003

- Client construction trim-checks API keys without modifying the header value and rejects negative timeouts.
- Server URLs are parsed once, require absolute HTTP(S) with a host and no query/fragment, normalize trailing slashes, and preserve configured base paths when joining operation paths.
- Caller-provided HTTP clients are used unchanged; the requested timeout remains available through `Client.Timeout()` for reporting.
- CLI `--timeout` rejects negative durations before client construction.
- `go test ./internal/plakysdk ./internal/cli`, `go vet ./...`, and `git diff --check` exited 0.

### O001

- Official source: `https://docs.plaky.com/`, fetched `2026-07-26T22:46:49.352Z` with HTTP 200 and content type `text/html; charset=utf-8`.
- Raw SHA-256: `e03c50ed74fcf994d670ff1eb9167f3fe437e2e83935def5bc1798f73c06984f`; canonical SHA-256: `0aa047cec4b45908b428eff54f5e6b16de1b306486a2ac182eda3b8ddb9bb5c2`.
- Candidate inventory is exactly 32 method/path keys: all expected 32, no missing or unexpected key, and no unresolved external `$ref`.
- Semantic diff command reported `breaking` because it compares four newly introduced required-property arrays against absence; its operation changes are exactly the 12 additive endpoints, with no removal, relocation, or transport change to the existing 20.
- Source transport review confirmed: paged Item Group list; object get/create/update responses; required JSON create/update bodies; bodyless 200 delete/archive; binary multipart part `file` with 201 object response; bare-array file list; object details/update; `{ url, expiresInSeconds }` download link; and bodyless 200 file delete.
- A Chrome rendering of the official docs exposed the same 12 endpoint labels. Expanded rendered sections independently confirmed multipart `file`, bare-array listing, download-link fields, and the three bodyless 200 archive/delete operations.
- The taskbook's diagnostic example names an unsupported `--source` option; an equivalent source-derived method/path exact-set diagnostic was used without changing tracked tooling in this hold-point task.

### O002

- Copied the accepted 20-operation overlay into ignored candidate evidence and added six exact Item Group actions without changing tracked contracts or generated outputs.
- The official candidate already includes the `Item Groups` tag, so no tag or official endpoint description was duplicated.
- Candidate metadata contains the exact six stable operation IDs and MCP names; list pagination resolves `$.data`, read/write scopes match intent, and object responses use `itemGroup` compaction.
- Delete and archive are bodyless 200 operations with destructive confirmation, `[write, destructive]` scopes, and `raw` compaction.
- Request/response examples use non-empty titles/rankings and valid object shapes from the official schemas.
- Candidate overlay apply, source/DX lint, metadata generation, and the complete six-operation annotation assertion exited 0.

### O003

- Added six exact Item file actions to the ignored candidate overlay without changing tracked contracts or generated outputs.
- Upload metadata selects the official multipart request with one required binary `file` part and a 201 object response; list remains a bare JSON array; update remains required JSON; delete remains bodyless 200.
- Stable MCP names, read/write scopes, `itemFile`/`downloadLink`/`raw` compaction, and destructive confirmation were asserted across all six operations.
- Download-link output is marked sensitive. Its only example URL uses `https://example.com/`; the candidate overlay contains no API key, token, or real signed URL.
- Candidate overlay apply, source/DX lint, metadata generation, and the complete six-operation transport/annotation assertion exited 0.

### O004

- Accepted the reviewed official candidate at `2026-07-26T22:57:08.072Z`; accepted YAML SHA-256 is `fe3e5bac33564ecd11e4d4d7c8172904883abd967b56500e946db3df2415c1b7` and the manifest verifies 32 operations.
- Production overlay/metadata now contain exactly 32 expected operations with no missing, unexpected, or duplicate key. All existing 20 operation names remain present unchanged.
- Regeneration added 12 MCP raw tools, 12 Cobra raw commands, 12 Go methods/options/runners, the matching docs-index entries, and official Item Group/Item file/download schemas.
- Manual generated-output review confirmed streaming multipart upload, 201 object upload response, bare-array file list envelope, sensitive download-link handling, and bodyless 200 archive/delete receipts with destructive confirmation.
- Removed deprecated `bodyRequired` from production metadata and its loader/generator contract. Generated Go requests now use `JSONBody`/`Multipart`; legacy option `Body` remains only to keep existing curated CLI workflows compiling without touching forbidden curated commands.
- Removed the duplicated 20 hand-written operation runners and their compatibility-only helper aliases after generated runner ownership became complete.
- The task packet omitted five owning generator/test files required by its own metadata-removal, correct-request-kind, and codegen-test steps. Scope expanded only to `scripts/generate-operation-metadata.rb`, `scripts/lib/operation-metadata.mjs`, `scripts/lib/codegen-cli.mjs`, `scripts/test-operation-metadata-v2.rb`, and `test/fixtures/codegen/cli-operations-v2.go`; an exact changed-file audit found nothing else outside the packet list plus these necessities, and no forbidden SDK resource, MCP curated/server, or CLI curated file changed.
- A final second generation produced a byte-identical 689,202-byte patch before and after; both SHA-256 values are `79b1164010e1cc1ec566057b46c2d838e9b31140ee8aed20730fcf3634b98116`.
- Overlay/lint/metadata v1+v2, expected-contract, upstream-manifest, generator drift/determinism/goldens, Go suite, MCP build, and strict surface status all exited 0. Full SDK/CLI/MCP request parity remains intentionally scheduled for S006 after typed resources exist.

### S001

- Transport retry eligibility is now `GET`-only; every mutation method remains single-attempt even with `maxRetries` and an explicit idempotency key.
- Added `resolveExplicitIdempotencyKey` with params-over-options precedence and no fallback. All eight existing hand-written mutations use it and omit the header when the caller supplies no key.
- Kept the public subpath `resolveIdempotencyKey(params, options, prefix): string` behavior intact and marked it deprecated; `newIdempotencyKey` remains an explicit caller utility without deduplication claims.
- Focused retry/idempotency/HTTP suite passed 61 tests, including each mutation with and without a key; SDK build and type tests exited 0.

### S002

- Literal API keys are trim-validated at construction, while sync/async provider results are validated after resolution and before fetch; validation errors never include the key value.
- Server URLs are parsed and normalized once, require absolute HTTP(S) syntax and a host, reject credentials/query/fragment, preserve valid base paths, and remove trailing slashes.
- `timeoutMs` remains any finite non-negative number; `maxRetries` is now constrained to a finite non-negative integer without clamping either option.
- SDK build and typecheck exited 0; the focused client/request-builder/HTTP suite passed 58 tests; `git diff --check` exited 0.

### S003

- Added and root-exported `ItemGroupId`, `ItemFileId`, and `FolderId` brands, constructors, and `as*` aliases.
- Item Group, Item file, download, folder, and short-team response shapes now derive from the accepted generated schemas, with branded IDs overlaid where applicable.
- Board folder/space expansions, numeric team members, and short-team item subscriptions now match the generated 32-operation contract while deprecated compatibility fields remain intact.
- Public type tests pin every new brand/shape and expanded/unexpanded union; SDK build, type tests, typecheck, the 20-test client suite, and `git diff --check` exited 0. No generated file changed.

### S004

- Added the typed `client.itemGroups` resource with paged `list`/`iterate`/`listAll`, `get`, JSON `create`/`update`, and bodyless void `delete`/`archive` methods over the six official operations.
- Request body aliases derive directly from generated schemas; public parameter types accept branded or raw IDs and are exported from the package root.
- All mutation methods forward only caller-supplied idempotency keys and remain single-attempt. Archive/delete tests prove no body and no content type; encoded paths preserve a configured URL base path.
- SDK build, public type tests, and typecheck exited 0; the focused 8-test Item Groups suite covered all six wire shapes, pagination, explicit headers, path encoding, and retry prohibition; `git diff --check` exited 0.

### S005

- Added the typed `client.itemFiles` resource with bare-array `list`, Blob/FormData `upload`, `get`, one-shot download metadata, generated-schema JSON `update`, and bodyless void `delete` methods over the six official operations.
- Upload appends exactly one `file` part, optionally names it, preserves its bytes/media type, and leaves the multipart boundary to fetch; the SDK accepts no filesystem path.
- Download returns only `url` and `expiresInSeconds`, performs one API fetch, never follows the signed URL, and emits no console output. All mutations pass only explicit idempotency keys and remain single-attempt.
- SDK build, public type tests, and typecheck exited 0; the focused 7-test Item files suite covered all wire shapes, encoded paths, multipart details, no-follow/no-log handling, void deletion, and retry prohibition; `git diff --check` exited 0.
