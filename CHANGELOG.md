# Changelog

All notable user-visible changes are recorded here. The project follows
semantic versioning from `0.2.0` onward.

## [1.0.1] - 2026-08-03

Maintenance release for the SDK, CLI, MCP server, and release tooling.

### Correctness and safety

- Preserve resolver cancellation and direct exact-ID lookups across SDK
  workflows, and retry a failed pagination fetch without skipping its page.
- Fail closed on empty CLI pages that claim more data, while keeping raw and
  curated SDK, CLI, and MCP behavior in parity.
- Make post-release npm signature verification install the inspected registry
  package before checking its signatures.

### Release and documentation

- Refresh dependency overrides, package audits, secret scanning, package
  surface checks, and public safety documentation.

## [1.0.0] - 2026-07-28

First stable release of the SDK, CLI, MCP server, generators, and release
contract.

### Security and correctness

- Require HTTPS for remote API hosts, block credential-bearing redirects and
  cross-origin interceptor rewrites, validate request options, and bound
  buffered responses to a configurable 16 MiB default and 64 MiB ceiling.
- Preserve signed 64-bit identifiers as exact decimal strings, reject unsafe
  numbers and non-object required JSON bodies, and fail closed on malformed Go
  response envelopes and cross-surface parity drift.
- Keep writes single-attempt, identity resolution unambiguous, signed download
  URLs in memory only, and live cleanup scoped to one exact run UUID.

### SDK, CLI, and MCP

- Add exact Item Group and item-file resolvers plus plan-first MCP create/update
  workflows with resolved-target receipts, validated base64 uploads, negotiated
  progress, and cancellation.
- Add CLI API-key stdin input, deprecate argv credentials through 1.x, and make
  both installers checksum-bound, archive-safe, atomic, and rollback-aware.
- Split curated CLI commands by resource and centralize normalized generator
  descriptors without changing command, tool, or package export names.

### Verification and release

- Add recurring GET-only coverage for all 17 documented reads, production npm
  audits, pinned Go vulnerability checks, verification-inventory enforcement,
  and Linux/macOS/Windows compatibility jobs.
- Bind npm and CLI publication to the exact immutable tag commit, verify npm
  provenance and package digests after publication, and document the stable
  compatibility policy, threat model, and release evidence contract.

## [0.2.0] - 2026-07-27

First complete public release of the hand-crafted Plaky toolkit.

### TypeScript SDK

- Added resource-oriented Item Group and item-file APIs.
- Added generated schema types while keeping operation modules private.
- Added typed IDs, request/response metadata, interceptors, cancellation,
  dynamic authentication/headers, rate-limit snapshots, and detailed errors.
- Added paginated iterators, detailed item search, and deterministic
  spreadsheet-safe CSV export.
- Restricted automatic retries to `GET`; writes remain single-attempt.
- Preserved `PlakyClient`, `requestWithResponse`, runtime exports, and additive
  `CommentShape` compatibility.

### Go CLI

- Added 32 operation-shaped raw commands plus curated discovery, export, item,
  comment, group, and file workflows.
- Added dry-run/confirmation controls, stdin/file JSON bodies, streaming file
  uploads, versioned user agent, installers, and GoReleaser archives.
- Added complete pagination, detailed search metadata, and canonical CSV output.

### MCP server

- Added curated read/mutation workflows and 32 generated raw tools.
- Added structured results/errors, conservative output schemas, safe defaults,
  explicit scopes, upload bounds, and sensitive download-link handling.
- Default startup is curated/read-only; write and destructive tools are opt-in.

### Contract, security, and release

- Added deterministic local OpenAPI overlay, operation metadata, codegen, drift,
  cross-surface parity, and upstream freshness checks.
- Added centralized API-key redaction, direct filesystem secret scanning,
  package-content audits, consumer smoke tests, and exact action pinning.
- Added OIDC npm publishing with provenance and multi-platform CLI releases.
- Added UUID-scoped sacrificial live proof across API, SDK, CLI, and MCP with
  exact-ID cleanup and a single mutation-attempt budget.

[1.0.1]: https://github.com/apet97/plaky115/releases/tag/v1.0.1
[1.0.0]: https://github.com/apet97/plaky115/releases/tag/v1.0.0
[0.2.0]: https://github.com/apet97/plaky115/releases/tag/v0.2.0
