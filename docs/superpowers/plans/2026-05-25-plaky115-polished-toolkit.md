# Plaky115 Polished Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Plaky115 to a polished SDK/CLI/MCP target state where the OpenAPI overlay is the source of naming and agent annotations, Speakeasy generated output remains the low-level surface, curated SDK/CLI/MCP wrappers provide stable daily-use workflows, and every surface is proven by offline gates plus opt-in live contract tests.

**Architecture:** OpenAPI overlay and generated metadata are the contract. Speakeasy output is regenerated and audited, not hand-edited. Durable TypeScript runtime code provides pagination, errors, field helpers, resolvers, response slimming, docs search, and workflow execution. The Go CLI mirrors only stable behavior. MCP exposes both generated operation tools and curated workflow tools, with compact output by default and raw output opt-in. Live tests mutate only the sacrificial workspace and clean up after themselves.

**Tech Stack:** Speakeasy CLI, OpenAPI overlay, Ruby OpenAPI metadata generator, Node.js scripts and `node:test`, TypeScript SDK, TypeScript MCP server, Go/Cobra CLI, GitHub Actions, GoReleaser validation, optional live Plaky API key, optional Speakeasy key.

---

## Current Evidence

- [ ] Treat these repo facts as the baseline before making changes.
  - `git log --oneline -7` shows the current main branch already has overlay metadata, SDK DX runtime, curated CLI workflows, curated MCP modes, release gates, and refreshed Speakeasy TypeScript SDK core.
  - `openapi/plaky115-operation-metadata.json` currently contains 20 curated operation IDs, including `listSpaces`, `listBoards`, `listItems`, `createItem`, `updateItemField`, `updateItemFields`, `listItemComments`, and `replaceCommentReactions`.
  - `npm run metadata:test` passes with 156 assertions.
  - `npm --prefix sdk test`, `npm --prefix mcp-server test`, and `cd cli && go test ./... && go build ...` pass.
  - The TypeScript SDK source is mostly overlay-fresh, but `sdk/esm/funcs` still contains 15 stale generated JS operation files from the old Speakeasy naming pass.
  - The generated CLI and generated MCP operation names still expose older names such as `getspaces`, `getitemsforboardview`, and `items-get-items-for-board-view`.
  - The current Speakeasy workspace is on a free plan and blocks additional generated SDK targets after one SDK target. The repo must report that as a known generation constraint instead of hiding it.
  - `npm --prefix sdk pack --dry-run --json` fails with `Invalid package, must have name and version`, while `(cd sdk && npm pack --dry-run --json)` succeeds. Pack smoke must run with `cwd`, not `--prefix`.
  - `scripts/postgen-dx.mjs` still performs broad generated-file patching. The target state is smaller postgen hooks plus durable wrapper modules.

---

## Documentation Anchors

- [ ] Use these public docs as the customization boundary.
  - Speakeasy OpenAPI and generation path:
    - `https://www.speakeasy.com/docs/customize-sdks/sdk-docs`
    - `https://www.speakeasy.com/docs/cli-generation/customize-cli`
    - `https://www.speakeasy.com/docs/manage/github-setup`
    - `https://www.speakeasy.com/docs/sdks/guides/sdk-preview-breaking-changes`
  - Stainless MCP design ideas to borrow safely:
    - `https://www.stainless.com/docs/guides/generate-an-mcp-server`
    - `https://www.stainless.com/docs/mcp`
    - `https://www.stainless.com/docs/mcp/permissions`
    - `https://www.stainless.com/docs/reference/diagnostics`
  - Concrete interpretation:
    - Prefer overlay, OpenAPI extensions, `gen.yaml`, and generated workflow configuration first.
    - Keep generated SDK/CLI/MCP as low-level surfaces.
    - Add curated wrappers around generated code, not inside it.
    - Do not add arbitrary local TypeScript execution until there is a real sandbox. Keep named workflows first.
    - Add docs search and compact workflow tools because those are useful and safe without code execution.

---

## Desired File Layout

- [ ] Add these files.
  - `scripts/lib/surface-audit.mjs`
  - `scripts/status-surfaces.mjs`
  - `scripts/test-surface-audit.mjs`
  - `scripts/clean-package-builds.mjs`
  - `scripts/audit-package-artifacts.mjs`
  - `scripts/pack-smoke.mjs`
  - `scripts/regenerate-target.mjs`
  - `scripts/test-regenerate-target.mjs`
  - `scripts/generate-mcp-docs-index.mjs`
  - `mcp-server/src/mcp-server/plaky/docs-index.ts`
  - `mcp-server/src/mcp-server/plaky/compaction.ts`
  - `mcp-server/src/mcp-server/plaky/workflows.ts`
  - `mcp-server/src/mcp-server/plaky/http.ts`
  - `cli/internal/plakydx/pagination.go`
  - `cli/internal/plakydx/compact.go`
  - `cli/internal/plakydx/fields.go`
  - `cli/internal/plakydx/mutation_plan.go`
  - `docs/surfaces.md`
  - `docs/regeneration.md`
  - `docs/release-checklist.md`

- [ ] Modify these files.
  - `package.json`
  - `sdk/package.json`
  - `mcp-server/package.json`
  - `scripts/regenerate.mjs`
  - `scripts/postgen-dx.mjs`
  - `.github/workflows/ci.yml`
  - `mcp-server/src/mcp-server/plaky-curated-tools.ts`
  - `mcp-server/test/plaky-tools.test.mjs`
  - `sdk/test/plaky.test.mjs`
  - `cli/internal/cli/dx.go`
  - `cli/internal/cli/*_test.go`
  - `README.md`
  - `docs/live-smoke.md`

---

## Phase 1: Surface Truth And Drift Reporting

- [ ] Write a failing surface audit test first.
  - Create `scripts/test-surface-audit.mjs`.
  - The test must prove:
    - metadata has 20 operation IDs.
    - SDK client methods expose overlay names.
    - stale SDK `esm/funcs` files are detected.
    - CLI and generated MCP old-name drift is reported as `known-drift` or `blocked`, never as fresh.
    - `getCurrentUser` is handled correctly even though it does not need a request model file.

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSurfaceReport } from "./lib/surface-audit.mjs";

test("surface report separates fresh, stale, and blocked surfaces", async () => {
  const report = await buildSurfaceReport(new URL("..", import.meta.url));

  assert.equal(report.metadata.operationCount, 20);
  assert.ok(report.metadata.operationIds.includes("getCurrentUser"));
  assert.ok(report.sdk.methods.includes("getCurrentUser"));
  assert.equal(report.sdk.missingMethods.length, 0);
  assert.ok(report.sdk.staleBuildFiles.some((file) => file.includes("spaces-get-spaces")));
  assert.match(report.cli.generatedCore.status, /known-drift|blocked/);
  assert.match(report.mcp.generatedTools.status, /known-drift|blocked/);
});
```

- [ ] Implement `scripts/lib/surface-audit.mjs`.
  - Read `openapi/plaky115-operation-metadata.json`.
  - Parse SDK methods from `sdk/src/sdk/*.ts` using `async methodName(`.
  - Parse generated function source files from `src/funcs/*.ts`.
  - Parse built function files from `esm/funcs/*.js`.
  - Compare source and built function slugs per package.
  - Parse CLI generated commands from `cli/internal/cli/generated.go` and related generated files.
  - Parse MCP generated tool names from `mcp-server/src/mcp-server/tools.ts` or generated MCP registration files.
  - Return a JSON-safe report with this shape:

```js
{
  metadata: { operationCount, operationIds },
  sdk: {
    status,
    methods,
    missingMethods,
    staleBuildFiles,
    missingBuildFiles
  },
  cli: {
    generatedCore: { status, currentNames, expectedNames, knownConstraint }
  },
  mcp: {
    generatedTools: { status, currentNames, expectedNames, knownConstraint }
  },
  curated: {
    cliCommands,
    mcpTools,
    workflows
  }
}
```

- [ ] Add `scripts/status-surfaces.mjs`.
  - Default output is human-readable.
  - `--json` outputs machine-readable JSON.
  - Non-zero exit only for unexpected drift or stale artifacts.
  - Do not fail for documented Speakeasy account constraints unless `--strict-generated` is passed.

- [ ] Add package scripts.

```json
{
  "status:surfaces": "node scripts/status-surfaces.mjs",
  "status:surfaces:json": "node scripts/status-surfaces.mjs --json",
  "test:surfaces": "node --test scripts/test-surface-audit.mjs"
}
```

- [ ] Verify.

```bash
npm run test:surfaces
npm run status:surfaces
npm run status:surfaces:json
```

---

## Phase 2: Clean Builds And Artifact Audits

- [ ] Write the stale artifact audit before changing build scripts.
  - Create `scripts/audit-package-artifacts.mjs`.
  - It must fail on the current stale SDK `esm/funcs` files.
  - It must compare `src/funcs/*.ts` to `esm/funcs/*.js` for both `sdk` and `mcp-server`.
  - It must report stale and missing files with exact paths.

- [ ] Implement `scripts/clean-package-builds.mjs`.

```js
import { rmSync } from "node:fs";
import { join } from "node:path";

const packageName = process.argv[2];
if (!["sdk", "mcp-server"].includes(packageName)) {
  throw new Error("usage: node scripts/clean-package-builds.mjs <sdk|mcp-server>");
}

const root = new URL("..", import.meta.url).pathname;
rmSync(join(root, packageName, "esm"), { recursive: true, force: true });

if (packageName === "mcp-server") {
  rmSync(join(root, packageName, "bin", "mcp-server.js"), { force: true });
}
```

- [ ] Update `sdk/package.json`.

```json
{
  "scripts": {
    "build": "node ../scripts/clean-package-builds.mjs sdk && tsgo",
    "test": "npm run build && node --test test/*.test.mjs"
  }
}
```

- [ ] Update `mcp-server/package.json`.

```json
{
  "scripts": {
    "build": "node ../scripts/clean-package-builds.mjs mcp-server && npm run build:mcp && tsgo",
    "test": "npm run build && node --test test/*.test.mjs"
  }
}
```

- [ ] Add root script.

```json
{
  "artifacts:audit": "node scripts/audit-package-artifacts.mjs"
}
```

- [ ] Verify the failure and fix sequence.

```bash
node scripts/audit-package-artifacts.mjs
npm --prefix sdk test
npm --prefix mcp-server test
npm run artifacts:audit
```

- [ ] Expected result.
  - The first audit fails before clean rebuild.
  - SDK and MCP tests rebuild clean `esm` trees.
  - The second audit passes.

---

## Phase 3: Package Smoke Gates

- [ ] Add `scripts/pack-smoke.mjs`.
  - Use `spawnSync("npm", ["pack", "--dry-run", "--json"], { cwd: packageDir })`.
  - Do not use `npm --prefix`.
  - Validate `sdk` tarball contents:
    - includes `package.json`.
    - includes `esm/sdk/sdk.js`.
    - includes `esm/funcs/list-spaces.js`.
    - does not include stale old operation files such as `esm/funcs/spaces-get-spaces.js`.
  - Validate `mcp-server` tarball contents:
    - includes `package.json`.
    - includes `bin/mcp-server.js`.
    - includes `esm/mcp-server/plaky-curated-tools.js` or its replacement wrapper.
  - Optionally create a temporary install test:
    - pack the SDK.
    - install it into a temp package.
    - import the public client and curated helper exports.

- [ ] Add root script.

```json
{
  "pack:smoke": "node scripts/pack-smoke.mjs"
}
```

- [ ] Verify.

```bash
npm run pack:smoke
```

---

## Phase 4: Target-Specific Regeneration

- [ ] Add a dry-run test before changing regeneration behavior.
  - Create `scripts/test-regenerate-target.mjs`.
  - Set `PLAKY115_REGEN_DRY_RUN=1`.
  - Assert target command planning:
    - `sdk` plans only TypeScript SDK generation.
    - `cli` plans only CLI generation.
    - `mcp` plans only MCP generation.
    - `all` plans the three targets in order.
    - every target plans overlay apply, OpenAPI lint, and metadata generation first.

- [ ] Implement `scripts/regenerate-target.mjs`.
  - Flags:
    - `--target sdk|cli|mcp|all`
    - `--skip-verify`
    - `--json`
    - `--allow-known-blocked`
  - Always run:

```bash
npm run overlay:apply
npm run lint:openapi
npm run metadata:generate
```

  - For SDK:

```bash
speakeasy generate sdk -s openapi/plaky115.openapi.yaml -l typescript -o sdk
```

  - For CLI:

```bash
speakeasy generate sdk -s openapi/plaky115.openapi.yaml -l cli -o cli
```

  - For MCP:

```bash
speakeasy generate sdk -s openapi/plaky115.openapi.yaml -l typescript -o mcp-server
```

  - After generation:

```bash
npm run postgen
npm run metadata:test
npm run test:surfaces
npm run artifacts:audit
```

  - If Speakeasy rejects a target because of the current account limit:
    - capture the exact target.
    - exit non-zero by default.
    - with `--allow-known-blocked`, emit a `known-blocked` JSON report and leave a clear next step.
    - never leave users guessing which generated surface is current.

- [ ] Update `scripts/regenerate.mjs`.
  - Keep it as a compatibility wrapper.
  - Delegate to `scripts/regenerate-target.mjs --target all`.

- [ ] Add package scripts.

```json
{
  "regenerate:sdk": "node scripts/regenerate-target.mjs --target sdk",
  "regenerate:cli": "node scripts/regenerate-target.mjs --target cli",
  "regenerate:mcp": "node scripts/regenerate-target.mjs --target mcp",
  "regenerate:all": "node scripts/regenerate-target.mjs --target all"
}
```

- [ ] Verify without spending Speakeasy calls.

```bash
PLAKY115_REGEN_DRY_RUN=1 npm run regenerate:sdk
PLAKY115_REGEN_DRY_RUN=1 npm run regenerate:cli
PLAKY115_REGEN_DRY_RUN=1 npm run regenerate:mcp
node --test scripts/test-regenerate-target.mjs
```

- [ ] Verify with the real Speakeasy key only after dry-run passes.

```bash
SPEAKEASY_API_KEY=... npm run regenerate:sdk
npm run status:surfaces
```

---

## Phase 5: Reduce Postgen To Small Hooks

- [ ] Add a postgen patch inventory.
  - Extend `scripts/postgen-dx.mjs` so `node scripts/postgen-dx.mjs --report` prints every generated file it patches and why.
  - Categorize each patch:
    - package metadata.
    - generated import hook.
    - MCP mode flag.
    - MCP tool registration.
    - docs or README.
    - workaround.

- [ ] Move durable logic out of generated files.
  - Create stable MCP modules under `mcp-server/src/mcp-server/plaky/`.
  - Keep generated-file patches limited to:
    - importing curated registration.
    - invoking curated registration.
    - preserving package metadata that Speakeasy cannot express.
  - Every broad string replacement must have a test or be removed.

- [ ] Add `postgen` tests.
  - Run `npm run postgen` twice and assert no diff after the second run.
  - Assert generated entry points contain only small hook markers.

```bash
npm run postgen
git diff --check
npm run postgen
git diff --exit-code -- mcp-server/src/mcp-server/server.ts mcp-server/package.json sdk/package.json
```

---

## Phase 6: Metadata-Driven Docs Search

- [ ] Add `scripts/generate-mcp-docs-index.mjs`.
  - Input:
    - `openapi/plaky115-operation-metadata.json`
    - operation summaries from `openapi/plaky115.openapi.yaml`
    - examples from overlay-supported fields.
    - local docs files such as `README.md`, `docs/live-smoke.md`, and `docs/install-snippets.md`.
  - Output:
    - `mcp-server/src/mcp-server/plaky/docs-index.ts`.
  - Each index entry:

```ts
export type PlakyDocsEntry = {
  id: string;
  title: string;
  kind: "operation" | "workflow" | "guide";
  text: string;
  operationId?: string;
  workflowId?: string;
  scopes: Array<"read" | "write" | "destructive">;
};
```

- [ ] Replace the hardcoded docs array in `plaky-curated-tools.ts`.
  - `plaky_search_docs` must use the generated docs index.
  - Search should be deterministic:
    - lowercase token matching.
    - exact operation ID boost.
    - workflow ID boost.
    - summary/title boost.
  - Return compact entries by default.
  - Include raw entry text only when `includeRaw: true`.

- [ ] Add tests.
  - Search `pagination hasMore` returns pagination docs.
  - Search `replace reactions` returns `replaceCommentReactions`.
  - Search `bulk update fields` returns `items.updateFields`.
  - Default response does not include long raw docs.
  - `includeRaw: true` includes source text.

---

## Phase 7: Curated MCP Runtime Split

- [ ] Create `mcp-server/src/mcp-server/plaky/compaction.ts`.
  - Export:
    - `compactItem(item)`
    - `compactBoard(board)`
    - `compactSpace(space)`
    - `compactComment(comment)`
    - `maybeIncludeRaw(compact, raw, includeRaw)`
  - Rules:
    - default response includes IDs, titles/names, key field summaries, and URLs if available.
    - omit large nested raw payloads by default.
    - redact API key-like strings in diagnostics.

- [ ] Create `mcp-server/src/mcp-server/plaky/http.ts`.
  - Export:
    - `createPlakyHttpClient({ apiKey, serverURL, timeoutMs })`
    - `requestJson(method, path, body?)`
    - normalized error conversion.
  - Keep auth header handling centralized.

- [ ] Create `mcp-server/src/mcp-server/plaky/workflows.ts`.
  - Export workflow IDs:
    - `workspace.map`
    - `items.search`
    - `items.create`
    - `items.updateFields`
    - `comments.add`
    - `comments.thread`
    - `export.items`
  - Export workflow schemas, planning, and execution functions.
  - All write workflows must support a dry-run plan path before executing.
  - Destructive workflows must require destructive scope.

- [ ] Convert `plaky-curated-tools.ts` to registration only.
  - Keep tool registration and CLI flags in this file.
  - Import docs, compaction, HTTP, and workflow helpers from stable modules.

- [ ] Add tests.
  - `--mode curated` registers only curated tools.
  - `--mode generated` registers only generated tools.
  - `--mode all` registers both.
  - `--scope read` excludes write/destructive tools.
  - compact output omits raw payload.
  - `includeRaw: true` includes raw payload.
  - mutation planning works without live API writes.

---

## Phase 8: SDK Wrapper Polish

- [ ] Expand SDK iterator tests first.
  - Existing iterator tests must cover:
    - `hasMore: false` stops iteration.
    - `limit` stops early.
    - `pageSize` is passed to the generated operation.
    - item iteration accepts `expand`.
    - page iterators return page envelopes.
    - `listAll()` builds on the item iterator, not on duplicated pagination logic.

- [ ] Confirm and complete SDK high-level namespaces.
  - `client.spaces.iterate({ pageSize, limit })`
  - `client.spaces.iteratePages({ pageSize, limit })`
  - `client.spaces.listAll({ pageSize, limit })`
  - `client.boards.iterate({ space, pageSize, limit })`
  - `client.items.iterate({ space, board, pageSize, limit, expand })`
  - `client.users.iterate(...)`
  - `client.teams.iterate(...)`
  - `client.fields.forBoard({ space, board })`
  - `client.fields.resolve({ titleOrKey })`
  - `client.resolve.space(...)`
  - `client.resolve.board(...)`
  - `client.resolve.user(...)`
  - `client.resolve.team(...)`
  - `client.resolve.item(...)`

- [ ] Harden SDK error classes.
  - Ensure all generated and raw requests normalize to:
    - `PlakyApiError`
    - `PlakyRateLimitError`
    - `PlakyValidationError`
    - `PlakyNotFoundError`
    - `PlakyAmbiguousMatchError`
  - Preserve:
    - status code.
    - request ID if present.
    - retry-after when present.
    - sanitized response body.
  - Never include API keys or full auth headers in error output.

- [ ] Harden retry behavior.
  - Retry 429 and selected 5xx responses.
  - Honor `Retry-After`.
  - Default max retries must be small and documented.
  - Mutating requests require idempotency awareness before automatic retry.
  - Add `client.withOptions({ timeoutMs, retries, serverURL, compact })`.

- [ ] Field builders.
  - Confirm or add:
    - `stringField`
    - `statusField`
    - `tagField`
    - `personField`
    - `timelineField`
    - `linkField`
    - `numberField`
  - Tests must assert exact payloads and invalid input messages.

- [ ] Verify.

```bash
npm --prefix sdk test
npm run artifacts:audit
npm run pack:smoke
```

---

## Phase 9: CLI Runtime Split And Safety

- [ ] Create `cli/internal/plakydx`.
  - `pagination.go`
    - common `--all`, `--limit`, and `--page-size` behavior.
  - `compact.go`
    - compact JSON output and `--agent` output helpers.
  - `fields.go`
    - field payload builders mirroring SDK stable behavior.
  - `mutation_plan.go`
    - dry-run mutation summaries and destructive confirmation checks.

- [ ] Move behavior out of `cli/internal/cli/dx.go` gradually.
  - Do not rewrite the whole file at once.
  - Extract one behavior group per commit:
    - pagination.
    - compact/agent output.
    - field helpers.
    - mutation planning.

- [ ] CLI command completion checklist.
  - `plaky115 find <query>`
  - `plaky115 workspace context`
  - `plaky115 fields list --space-id --board-id`
  - `plaky115 items export --format jsonl|csv`
  - `plaky115 items bulk-update --file updates.json --dry-run`
  - `plaky115 comments add/list/update/delete`
  - `plaky115 doctor --live`

- [ ] CLI safety rules.
  - Curated write commands support `--dry-run`.
  - Curated destructive commands require `--yes`.
  - `--agent` must not prompt.
  - `--agent` must emit deterministic JSON or TOON.
  - Diagnostics redact API keys and auth headers.
  - Root help stays concise.
  - Full generated API usage goes to `USAGE.md`.

- [ ] Verify.

```bash
cd cli
go test ./...
go build -o /tmp/plaky115 ./cmd/plaky115
/tmp/plaky115 --help
/tmp/plaky115 find --help
/tmp/plaky115 doctor --help
```

---

## Phase 10: Live Contract Matrix

- [ ] Keep live tests opt-in.
  - Required env:
    - `PLAKY_API_KEY`
    - optional `PLAKY_BASE_URL`
    - optional sacrificial IDs if the smoke runner cannot discover them.
  - Never write the key to logs, fixtures, docs, package files, or CI output.

- [ ] Expand `scripts/live-sweep.mjs`.
  - Raw API:
    - every operation in metadata.
    - hasMore pagination checks.
    - create/update/comment/reaction/delete cleanup.
  - SDK:
    - generated low-level operations.
    - iterators.
    - field builders.
    - resolvers.
    - workflows.
  - CLI:
    - generated commands where available.
    - curated commands.
    - `--agent`.
    - `--dry-run`.
  - MCP:
    - generated operation tools where available.
    - curated tools.
    - `--mode curated`.
    - `--mode generated`.
    - `--mode all`.
    - scope filtering.
    - compact/raw behavior.

- [ ] Add post-run smoke-item scan.
  - Scan the sacrificial board for test-created items by prefix.
  - Delete leftovers only when safe and expected.
  - Report any leftover item IDs.

- [ ] Add record/replay after live matrix is stable.
  - `scripts/record-live-fixtures.mjs`
    - records sanitized responses.
    - redacts API keys, auth headers, user emails if present, and workspace-specific IDs where practical.
  - `test/fixtures/plaky-live/*.json`
    - stable offline fixtures for pagination, comments, fields, and errors.
  - Offline replay tests prove wrapper behavior without live API calls.

- [ ] Verify.

```bash
npm run live:sweep
npm run secret:scan
```

---

## Phase 11: CI, Release, And Public Docs

- [ ] Update CI only after local commands pass.
  - Add:

```bash
npm run overlay:validate
npm run overlay:apply
npm run lint:openapi
npm run metadata:generate
npm run metadata:test
npm run test:surfaces
npm run status:surfaces
npm run artifacts:audit
npm run pack:smoke
npm --prefix sdk test
npm --prefix mcp-server test
cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115
npm run secret:scan
npm run goreleaser:check
```

- [ ] Keep live CI manual.
  - The live workflow must require secrets.
  - It must never run on untrusted pull requests.
  - It must use the sacrificial workspace only.

- [ ] Add or update docs.
  - `docs/surfaces.md`
    - explains generated SDK, generated CLI, generated MCP, curated SDK, curated CLI, curated MCP.
    - includes current surface status and how to refresh it.
  - `docs/regeneration.md`
    - explains overlay apply, generation target commands, Speakeasy account constraints, postgen, and verification.
  - `docs/release-checklist.md`
    - includes local gates, package smoke, live sweep, secret scan, release notes, and install snippets.
  - `README.md`
    - concise public entry point.
    - includes unofficial Plaky115 disclaimer.
    - links to full docs instead of dumping generated API details.
  - `USAGE.md`
    - generated CLI command reference.
  - `docs/install-snippets.md`
    - Claude Desktop.
    - Claude Code.
    - Cursor.
    - local CLI.

- [ ] Verify public package metadata.
  - SDK package:
    - name, version, license, repository, files, exports.
  - MCP package:
    - bin entry, files, exports, engine requirements.
  - CLI:
    - GoReleaser config validates.
    - generated archives use predictable names.

---

## Phase 12: Speakeasy Account Unblock Path

- [ ] Keep this phase separate from repo correctness.
  - The repo can be solid before CLI/MCP regeneration is unblocked.
  - The surface report must keep stating what is generated-current and what is blocked by account state.

- [ ] Once the Speakeasy account allows multiple targets, run:

```bash
SPEAKEASY_API_KEY=... npm run regenerate:cli
SPEAKEASY_API_KEY=... npm run regenerate:mcp
npm run status:surfaces
npm run verify
npm run pack:smoke
```

- [ ] After regenerated CLI and MCP use overlay names:
  - remove old-name compatibility assumptions from curated code.
  - update tests that currently allow `known-drift`.
  - make `npm run status:surfaces -- --strict-generated` pass.
  - document the exact Speakeasy CLI version used.

---

## Final Verification Matrix

- [ ] Local deterministic gates.

```bash
npm run overlay:validate
npm run overlay:apply
npm run lint:openapi
npm run metadata:generate
npm run metadata:test
npm run test:surfaces
npm run status:surfaces
npm run artifacts:audit
npm run pack:smoke
npm --prefix sdk test
npm --prefix mcp-server test
cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115
npm run secret:scan
npm run goreleaser:check
```

- [ ] Optional live gate.

```bash
npm run live:sweep
npm run secret:scan
```

- [ ] Generated target gates when Speakeasy allows them.

```bash
SPEAKEASY_API_KEY=... npm run regenerate:sdk
SPEAKEASY_API_KEY=... npm run regenerate:cli
SPEAKEASY_API_KEY=... npm run regenerate:mcp
npm run status:surfaces -- --strict-generated
```

---

## Commit Plan

- [ ] Commit 1: surface audit and status report.
- [ ] Commit 2: clean build scripts and artifact audit.
- [ ] Commit 3: package smoke gate.
- [ ] Commit 4: target-specific regeneration flow.
- [ ] Commit 5: postgen inventory and smaller MCP hook boundary.
- [ ] Commit 6: metadata-driven MCP docs search.
- [ ] Commit 7: MCP runtime split and workflow schemas.
- [ ] Commit 8: SDK iterator, errors, retries, field helper hardening.
- [ ] Commit 9: CLI `plakydx` runtime split and safety tests.
- [ ] Commit 10: live matrix and fixture replay.
- [ ] Commit 11: CI, release, and docs polish.

---

## Self-Review Checklist

- [ ] No generated file was hand-edited unless the change is made through postgen or Speakeasy-supported configuration.
- [ ] Every new script has a local verification command.
- [ ] Every mutation surface has dry-run behavior before live write execution.
- [ ] Every destructive curated command requires explicit confirmation.
- [ ] Every agent-facing output path redacts secrets.
- [ ] MCP has compact output by default and raw output opt-in.
- [ ] Live tests create, update, comment, react, delete, and then scan for leftovers.
- [ ] CI can prove offline correctness without live secrets.
- [ ] Public docs include the unofficial Plaky115 disclaimer.
- [ ] Surface status tells the truth about the current Speakeasy account constraint.
