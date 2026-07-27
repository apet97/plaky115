# Public documentation and v0.2.0 release design

Date: 2026-07-27
Status: approved direction; implementation pending final spec review

## Goal

Make `apet97/plaky115` a concise, trustworthy public repository and publish the
first complete `v0.2.0` release without exposing internal execution artifacts or
weakening the existing verification, provenance, or secret-handling controls.

## Public audience

The documentation must serve four readers:

1. SDK users installing `plaky115`.
2. CLI users downloading or building `plaky115`.
3. MCP users installing `plaky115-mcp`.
4. Contributors maintaining the OpenAPI overlay, generators, and release gates.

Agent instructions remain tracked because the user explicitly wants optimized
`AGENTS.md` and `CLAUDE.md`, but they must read like concise project contracts,
not session logs.

## Content model

### Keep and overhaul

- `README.md`: public landing page, quick start, three-surface navigation,
  support matrix, safety model, documentation links, and release/install paths.
- `AGENTS.md`: shared engineering contract with exact setup, generated ownership,
  verification tiers, release stop conditions, and secret rules.
- `CLAUDE.md`: short Claude-specific orientation that links to `AGENTS.md` and
  records only non-obvious current compatibility and workflow details.
- `SECURITY.md`: public disclosure and credential/signed-link model.
- `sdk/README.md`, `cli/README.md`, `mcp-server/README.md`: package-specific
  installation and runnable examples with no duplicated repository narrative.
- `docs/api-behavior.md`: verified wire behavior and API quirks.
- `docs/api-evolution.md`: contributor process for upstream contract changes.
- `docs/codegen.md`: source-of-truth and generated-file ownership.
- `docs/install-snippets.md`: client-specific MCP setup.
- `docs/live-smoke.md`: sacrificial-only live proof and exact cleanup contract.
- `docs/release-checklist.md`: maintainer release procedure and bootstrap note.
- `docs/release/action-pins.md`: supply-chain pin provenance.
- `docs/surfaces.md`: concise relationship among SDK, CLI, and MCP surfaces.
- `examples/README.md` and `examples/mcp/recipes.md`: runnable examples.
- `security/plaky-api-key-grammar.md`: canonical cross-language redaction contract.

### Add

- `CONTRIBUTING.md`: focused setup, change ownership, verification tiers, and PR
  expectations.
- `CHANGELOG.md`: user-visible `0.2.0` release notes and compatibility guarantees.

### Delete before public integration

- `docs/implementation/plaky115-v0.2-baseline.md`: historical execution evidence.
- `docs/implementation/plaky115-v0.2-status.md`: 51-task internal proof ledger.
- `docs/release-notes-template.md`: replaced by `CHANGELOG.md` and GitHub release
  notes.
- `docs/public-release-design.md`: this temporary implementation specification.

Ignored local taskbooks, manifests, plans, and `.remember/` files must remain
untracked and must never be forced into Git.

## Presentation design

The repository should look polished without adding a decorative asset that must
be maintained:

- a compact title and one-sentence value proposition;
- CI, release, npm-version, license, Node, and Go badges whose targets are real;
- a three-column surface table for SDK, CLI, and MCP;
- copy-paste quick starts before architecture detail;
- a short “Why Plaky115” section limited to concrete capabilities;
- a documentation table grouped by user, contributor, security, and maintainer;
- a prominent unofficial/non-affiliation notice;
- consistent headings, command formatting, terminology, and link labels;
- no quality superlatives, generated marketing copy, stale counts, or internal
  task references.

GitHub repository metadata should be set to:

- Description: `Unofficial TypeScript SDK, Go CLI, and MCP server for the Plaky public API.`
- Topics: `plaky`, `typescript`, `sdk`, `golang`, `cli`, `mcp`, `model-context-protocol`, `openapi`
- Homepage: the repository URL until a dedicated documentation site exists.

## Guidance-file design

`AGENTS.md` owns rules shared by every coding agent:

- architecture and published artifacts;
- toolchain and setup;
- generated-file ownership;
- public compatibility;
- verification tiers;
- live mutation and cleanup contract;
- release prerequisites and hard stops;
- secrets, affiliation, license, and documentation style.

`CLAUDE.md` must not repeat those sections. It should contain:

- a mandatory pointer to `AGENTS.md`;
- a ten-line orientation map;
- focused commands by change type;
- current, non-obvious compatibility notes;
- Claude-specific rules for generated files, live proof, and public docs.

Target size is approximately 100-140 lines for `AGENTS.md` and 80-110 lines for
`CLAUDE.md`, with every command validated against `package.json` or the current
toolchain.

## Release design

### Integration

After the public-doc changes pass every gate, fast-forward the completed feature
branch into `main` and push `main`. Do not squash the proof history. Do not tag a
dirty or unverified commit.

### npm bootstrap

Both unscoped npm package names are currently available, and the local npm
session is authenticated as the repository owner. npm requires a package to
exist before a trusted publisher can be configured. Therefore the secure first
release requires a bootstrap rather than pretending OIDC can create the package:

1. Build and inspect both release tarballs.
2. From temporary copies outside the checkout, publish `0.2.0-beta.0` under the
   `beta` dist-tag using the authenticated interactive npm session. The tracked
   package manifests remain `0.2.0`.
3. Create the GitHub `npm-release` environment with release-tag deployment
   policy and maintainer approval if GitHub supports it for this repository.
4. Configure one trusted GitHub publisher for each package with exact identity:
   owner `apet97`, repository `plaky115`, workflow `release-npm.yml`, environment
   `npm-release`, allowed action `npm publish`.
5. Re-read both npm trust configurations and the GitHub environment before any
   stable tag is created.

If interactive npm authentication or 2FA blocks the bootstrap, stop before
publishing or tagging and ask the user to complete the prompt. Never substitute
a long-lived automation token.

### Stable release

1. Run the full clean release gate on the exact `main` commit.
2. Run the sacrificial live sweep only with the already authorized target and
   require API/SDK/CLI/MCP success plus zero leftovers.
3. Confirm `plaky115@0.2.0` and `plaky115-mcp@0.2.0` are absent.
4. Create and push annotated tag `v0.2.0`.
5. Let the pinned GitHub workflows publish npm packages with OIDC/provenance and
   build the GitHub CLI release.
6. Verify both workflow conclusions, npm versions, package provenance, package
   contents, GitHub release assets/checksums, tag target, and install smoke.

Never reuse or move a failed public tag. A failed stable publication stops the
release and is reported exactly.

## Verification

Documentation changes must pass:

```bash
npm run generate:docs-index
npm run docs:surface:test
npm run examples:check
npm run packsnapshot:write
```

The final integrated tree must pass the complete repository gates from
`AGENTS.md`, including `npm run verify`, package dry-runs, consumer smoke,
GoReleaser snapshot, secret scan, clean generated status, and live sweep.

## Completion criteria

- Public `main` contains no internal implementation ledgers or plan documents.
- README and package docs provide working installation paths for all surfaces.
- `AGENTS.md` and `CLAUDE.md` are current, concise, and non-duplicative.
- GitHub description, topics, homepage, and release are populated.
- Both npm packages install at exactly `0.2.0` and show trusted provenance.
- GitHub release `v0.2.0` contains the expected CLI archives and checksums.
- All final scans and tests pass and the repository is clean.
