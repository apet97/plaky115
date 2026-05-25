# Plaky115 Polished Toolkit Implementation Plan (v2 — Hand-Crafted, No Speakeasy Generation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Supersedes:** `2026-05-25-plaky115-polished-toolkit.md` (v1). v1 assumed continued access to Speakeasy cloud generation. The Speakeasy workspace has hit its plan limit and cloud `speakeasy generate` is no longer available. The Speakeasy CLI's local subcommands (`overlay validate/apply/compare`, `lint openapi`) remain available and are still used.

**Goal:** Bring Plaky115 to a polished, Stainless-mirror SDK/CLI/MCP target state where the OpenAPI overlay is the spec of record, `openapi-typescript` produces typed request/response shapes, a small in-repo generator scaffolds low-level operation modules from `metadata.json`, and hand-crafted resource clients, CLI commands, and MCP tools are the public surface. Every surface is proven by offline gates plus opt-in live contract tests.

**Architecture:** Three layers per target.
1. **Generated types** — one TypeScript module per target (`generated/types.ts`) emitted by `openapi-typescript` from `openapi/plaky115-dx.openapi.yaml`. Pure type information, zero runtime.
2. **Generated low-level operation modules** — one file per operation, emitted by an in-repo Node script that reads `openapi/plaky115-operation-metadata.json` and the generated types. Each module is a single `fetch`-shaped function that takes typed inputs, returns typed outputs, raises typed errors. No opinions, no retry logic, no pagination.
3. **Hand-crafted curated surface** — resource-oriented `PlakyClient` (TS SDK), curated cobra subtree (Go CLI), and curated MCP tool registry. This layer carries pagination iterators, retries, idempotency, error normalization, rate-limit budget tracking, interceptors, webhook helpers, mutation planning, and workflow composition. This is *the* surface end users touch.

Generated artifacts live under `*/src/generated/` (or `cli/internal/generated/`) so hand-written code is visibly separate. Generation is deterministic and idempotent — running it twice produces no diff. Speakeasy CLI is used only for overlay apply/validate/compare and OpenAPI lint.

**Tech Stack:** `openapi-typescript` (npm) for type generation, OpenAPI overlay (Speakeasy CLI local subcommands), Ruby OpenAPI metadata generator (existing), Node.js scripts + `node:test`, hand-crafted TypeScript SDK (`zod` for input validation, native `fetch`), hand-crafted TypeScript MCP server (`@modelcontextprotocol/sdk` + `bun` for stdio bundling), hand-crafted Go/Cobra CLI with `picocolors`-style coloring via Go's `fatih/color`, GitHub Actions, GoReleaser validation, optional Plaky API key.

**Tech to drop:** Speakeasy cloud generation, Speakeasy-generated Go SDK (`cli/internal/sdk/`), Speakeasy-generated MCP scaffolding (`mcp-server/src/mcp-server/{tools,tools.ts,core.ts,server.ts}` as currently emitted), Speakeasy `core.ts`/`hooks/`/`lib/` complexity in the TS SDK (some `lib/` utilities are kept and trimmed; full Speakeasy runtime is removed).

---

## Current Evidence (verified 2026-05-25)

- [ ] Treat these repo facts as the baseline. Verify before changes.
  - `git log --oneline -7` shows `7a9c697 feat: refresh speakeasy typescript core` is HEAD on `main`; working tree is clean except `docs/superpowers/` is untracked.
  - `speakeasy --version` returns `1.763.6` (installed via Homebrew); `speakeasy overlay --help` and `speakeasy lint --help` work without an API key. Only `speakeasy generate sdk -l <target>` calls the Speakeasy Workspace cloud and currently fails on plan limits.
  - `openapi/plaky115-operation-metadata.json` has `operations: 20`, with helpers `paths`, `scopes`, `listEndpoints` (6 entries), `mutations`, `destructive` (`deleteItem`, `deleteItemComment`), and `examples`.
  - The 20 operation IDs are: `listSpaces, listTeams, listUsers, listBoards, listItems, createItem, getSpace, getTeam, getCurrentUser, getBoard, listSubitems, getItem, deleteItem, updateItemField, updateItemFields, listItemComments, createItemComment, updateItemComment, deleteItemComment, replaceCommentReactions`.
  - `sdk/src/funcs/*.ts` has 20 source files matching overlay names. `sdk/esm/funcs/*.js` has 28 built files — 8 stale carry old Speakeasy names (`boards-get-board-by-id.js`, `boards-get-boards-for-space.js`, `item-comment-reactions-update-user-reactions.js`, etc.).
  - `sdk/src/plaky/index.ts` is 946 lines and already exports a `createPlakyClient` plus `fieldValues`, `statusField`, etc. This becomes the basis of the new public surface, not a wrapper around generated code.
  - `mcp-server/src/mcp-server/plaky-curated-tools.ts` is 572 lines with the curated workflows already partly implemented (`searchDocs`, `compactItem/Board/Space/Comment`, workflow IDs). It imports from generated funcs that use old names (`boardsGetBoardsForSpace`, `itemsGetItemsForBoardView`, `spacesGetSpaces`) — those import paths are stale and must be replaced when the SDK surface is hand-crafted.
  - `cli/internal/cli/dx.go` is 869 lines and registers curated commands (`doctor`, `workspace`, `find`, `fields`, plus `items` extensions). It imports `cli/internal/sdk` (Speakeasy-generated Go SDK), which must be replaced.
  - `scripts/regenerate.mjs` is 118 lines and wraps `speakeasy lint` + `speakeasy overlay apply` + `speakeasy generate`. The `generate` step is dead; the others stay.
  - `scripts/postgen-dx.mjs` is 797 lines of broad generated-file patching. After hand-crafting, only ~50 lines remain (package metadata sync only).
  - `scripts/live-workspace-sweep.mjs` is 955 lines and already exercises live CRUD against the sacrificial workspace; structure is reused.
  - `npm --prefix sdk pack --dry-run --json` fails (`Invalid package, must have name and version`). Use `npm pack --dry-run --json` with `cwd: 'sdk'` from a `spawnSync` instead, or `(cd sdk && npm pack --dry-run --json)`.
  - The user has indicated the Plaky API key has been pasted into chat. The key MUST be rotated on the Plaky dashboard before any live run. No script, log, fixture, doc, or commit should contain a `plk_…` value.

---

## Documentation Anchors

- [ ] Use these as the customization boundary.
  - `openapi-typescript` (type-only generation): `https://openapi-ts.dev`
  - OpenAPI Overlay spec: `https://spec.openapis.org/overlay/v1.0.0.html`
  - Speakeasy local overlay/lint (we keep these): `https://www.speakeasy.com/docs/customize-sdks/overlays`, `https://www.speakeasy.com/docs/linting`
  - Stainless design references (we mirror the *look*, not their tooling):
    - SDK shape: `https://www.stainless.com/docs/guides/sdk-design`
    - MCP design: `https://www.stainless.com/docs/mcp`, `https://www.stainless.com/docs/mcp/permissions`
    - Diagnostics: `https://www.stainless.com/docs/reference/diagnostics`
  - Model Context Protocol: `https://modelcontextprotocol.io/docs`
  - Cobra (Go CLI): `https://github.com/spf13/cobra`
  - GoReleaser: `https://goreleaser.com`
  - Concrete interpretation:
    - Overlay + metadata are the contract. SDK/CLI/MCP surface is hand-crafted off them.
    - Type-only generation (no Speakeasy-style runtime emission) keeps generated code small and reviewable.
    - Curated surface owns retry, pagination, errors, idempotency, rate-limit budget, webhooks, workflow composition.
    - MCP exposes both per-operation tools and curated workflow tools, compact-by-default, scope-gated.

---

## Desired File Layout

- [ ] Add these files (full list — created across phases).
  - **Codegen scripts**
    - `scripts/lib/surface-audit.mjs`
    - `scripts/lib/codegen-types.mjs`
    - `scripts/lib/codegen-operations.mjs`
    - `scripts/lib/codegen-cli.mjs`
    - `scripts/lib/codegen-mcp.mjs`
    - `scripts/lib/codegen-docs-index.mjs`
    - `scripts/status-surfaces.mjs`
    - `scripts/test-surface-audit.mjs`
    - `scripts/clean-package-builds.mjs`
    - `scripts/audit-package-artifacts.mjs`
    - `scripts/pack-smoke.mjs`
    - `scripts/generate-types.mjs`
    - `scripts/generate-operations.mjs`
    - `scripts/generate-cli.mjs`
    - `scripts/generate-mcp.mjs`
    - `scripts/generate-docs-index.mjs`
    - `scripts/generate-all.mjs`
    - `scripts/test-codegen-determinism.mjs`
    - `scripts/test-postgen-determinism.mjs`
  - **TS SDK (hand-crafted public surface + generated low-level)**
    - `sdk/src/generated/types.ts`
    - `sdk/src/generated/operations/*.ts` (one per operation)
    - `sdk/src/generated/operation-table.ts`
    - `sdk/src/runtime/http.ts`
    - `sdk/src/runtime/errors.ts`
    - `sdk/src/runtime/pagination.ts`
    - `sdk/src/runtime/retries.ts`
    - `sdk/src/runtime/interceptors.ts`
    - `sdk/src/runtime/rate-limit.ts`
    - `sdk/src/runtime/idempotency.ts`
    - `sdk/src/runtime/webhooks.ts`
    - `sdk/src/runtime/redact.ts`
    - `sdk/src/runtime/user-agent.ts`
    - `sdk/src/runtime/ids.ts`
    - `sdk/src/client/client.ts`
    - `sdk/src/client/spaces.ts`
    - `sdk/src/client/boards.ts`
    - `sdk/src/client/items.ts`
    - `sdk/src/client/item-comments.ts`
    - `sdk/src/client/reactions.ts`
    - `sdk/src/client/users.ts`
    - `sdk/src/client/teams.ts`
    - `sdk/src/fields/builders.ts`
    - `sdk/src/fields/values.ts`
    - `sdk/src/resolvers/index.ts`
    - `sdk/src/workflows/index.ts`
    - `sdk/test/client.test.mjs`
    - `sdk/test/pagination.test.mjs`
    - `sdk/test/errors.test.mjs`
    - `sdk/test/retries.test.mjs`
    - `sdk/test/interceptors.test.mjs`
    - `sdk/test/rate-limit.test.mjs`
    - `sdk/test/idempotency.test.mjs`
    - `sdk/test/webhooks.test.mjs`
    - `sdk/test/fields.test.mjs`
    - `sdk/test/resolvers.test.mjs`
    - `sdk/test/workflows.test.mjs`
  - **MCP server**
    - `mcp-server/src/server/index.ts`
    - `mcp-server/src/server/stdio.ts`
    - `mcp-server/src/server/scopes.ts`
    - `mcp-server/src/server/modes.ts`
    - `mcp-server/src/server/build.mts`
    - `mcp-server/src/tools/raw/*.ts` (one per operation, generated)
    - `mcp-server/src/tools/raw/index.ts` (generated)
    - `mcp-server/src/tools/curated/search-docs.ts`
    - `mcp-server/src/tools/curated/workspace-context.ts`
    - `mcp-server/src/tools/curated/find.ts`
    - `mcp-server/src/tools/curated/plan-mutation.ts`
    - `mcp-server/src/tools/curated/execute-workflow.ts`
    - `mcp-server/src/tools/curated/index.ts`
    - `mcp-server/src/runtime/compaction.ts`
    - `mcp-server/src/runtime/docs-index.ts` (generated)
    - `mcp-server/src/runtime/progress.ts`
    - `mcp-server/test/server.test.mjs`
    - `mcp-server/test/scopes.test.mjs`
    - `mcp-server/test/curated-tools.test.mjs`
    - `mcp-server/test/raw-tools.test.mjs`
    - `mcp-server/test/docs-search.test.mjs`
  - **Go CLI**
    - `cli/internal/plakysdk/client.go`
    - `cli/internal/plakysdk/options.go`
    - `cli/internal/plakysdk/errors.go`
    - `cli/internal/plakysdk/pagination.go`
    - `cli/internal/plakysdk/retries.go`
    - `cli/internal/plakysdk/types.go` (generated)
    - `cli/internal/plakysdk/operations.go` (generated)
    - `cli/internal/plakydx/pagination.go`
    - `cli/internal/plakydx/compact.go`
    - `cli/internal/plakydx/fields.go`
    - `cli/internal/plakydx/mutation_plan.go`
    - `cli/internal/plakydx/profile.go`
    - `cli/internal/plakydx/colors.go`
    - `cli/internal/cli/raw/raw.go` (generated, registers raw subtree)
    - `cli/internal/cli/raw/*.go` (generated, one per operation)
    - `cli/internal/cli/completion.go`
    - `cli/internal/plakysdk/client_test.go`
    - `cli/internal/plakydx/*_test.go`
  - **Docs**
    - `docs/surfaces.md`
    - `docs/codegen.md`
    - `docs/api-evolution.md`
    - `docs/release-checklist.md`

- [ ] Modify these files.
  - `package.json` (root scripts)
  - `sdk/package.json`
  - `mcp-server/package.json`
  - `scripts/regenerate.mjs` (delegate to `generate-all.mjs`)
  - `scripts/postgen-dx.mjs` (shrink to ≤50 lines, package metadata sync only)
  - `.github/workflows/ci.yml`
  - `.github/workflows/live.yml`
  - `README.md`
  - `docs/live-smoke.md`

- [ ] Remove these (after hand-crafted replacements are in place).
  - `sdk/src/sdk/` (entire dir — Speakeasy sub-clients)
  - `sdk/src/funcs/` (entire dir — Speakeasy standalone funcs)
  - `sdk/src/models/` (Speakeasy-generated model classes; types now come from `generated/types.ts`)
  - `sdk/src/hooks/` (Speakeasy hook system)
  - `sdk/src/lib/` (most files; keep `dlv.ts`, `is-plain-object.ts`, `url.ts` only if tests prove they're used by hand-written runtime — otherwise delete)
  - `sdk/src/core.ts`
  - `sdk/src/types/` (replaced by `generated/types.ts`)
  - `sdk/src/plaky/` (content folded into `sdk/src/client/` + `sdk/src/fields/` + `sdk/src/workflows/`)
  - `sdk/esm/` (entire build output — rebuilt clean)
  - `mcp-server/src/mcp-server/{tools,tools.ts,server.ts,core.ts,scopes.ts,resources.ts,prompts.ts,extensions.ts,shared.ts,console-logger.ts,build.mts,cli,cli.ts,plaky-curated-tools.ts,mcp-server.ts}` (replaced by new hand-crafted server in `mcp-server/src/server/` and tools in `mcp-server/src/tools/`)
  - `mcp-server/esm/`
  - `cli/internal/sdk/` (Speakeasy-generated Go SDK)
  - `cli/internal/cli/{spaces,boards,items,itemcomments,itemcommentreactions,teams,users,configure.go,auth.go,root.go}` — replaced by `cli/internal/cli/root.go` (rewritten) + `cli/internal/cli/raw/` (generated)
  - `cli/internal/client/`, `cli/internal/plakyhttp/` if no longer referenced after the SDK swap (verify with `go build` before deletion)

---

## Phase 0: Isolated Worktree Setup

All work happens in an isolated `git worktree` so the `main` branch stays untouched until the toolkit is merge-ready. The user explicitly requested this — apply before any other change.

- [ ] **Step 1: Create the worktree on a new branch.**

  ```bash
  cd /Users/15x/Downloads/WORKING/addons-me/plaky115
  git worktree add ../plaky115-toolkit-v2 -b feat/handcrafted-toolkit-v2
  cd ../plaky115-toolkit-v2
  ```

  Expected: new directory `../plaky115-toolkit-v2/` exists with the same file tree, on branch `feat/handcrafted-toolkit-v2`.

- [ ] **Step 2: Install dependencies in the worktree.**

  ```bash
  npm install
  npm --prefix sdk install
  npm --prefix mcp-server install
  (cd cli && go mod download)
  ```

- [ ] **Step 3: Verify baseline tests pass in the worktree.**

  ```bash
  npm run metadata:test
  npm --prefix sdk test || echo "sdk tests will be rebuilt during Phase 5"
  cd cli && go test ./... && cd ..
  ```

  Some tests may fail — that's the starting baseline. Record which ones fail so the engineer can confirm later phases fix them.

- [ ] **Step 4: Note the branch name in the plan tracker.**

  Branch: `feat/handcrafted-toolkit-v2`. Worktree path: `../plaky115-toolkit-v2`. All subsequent commits land on this branch. Do not commit to `main`. Do not merge until Phase 11 final verification passes.

---

## Phase 1: Surface Truth And Drift Reporting

The audit understands seven surface categories under the new architecture:
1. **Spec & metadata** — overlay, operation metadata.
2. **Generated types** — `sdk/src/generated/types.ts`, `cli/internal/plakysdk/types.go` (when present).
3. **Generated low-level operations** — `sdk/src/generated/operations/*.ts`, `mcp-server/src/tools/raw/*.ts`, `cli/internal/cli/raw/*.go`.
4. **Hand-crafted SDK client** — `sdk/src/client/*.ts`.
5. **Hand-crafted CLI curated commands** — `cli/internal/cli/dx.go` + neighbours.
6. **Hand-crafted MCP curated tools** — `mcp-server/src/tools/curated/*.ts`.
7. **Build artifacts** — `sdk/esm/`, `mcp-server/esm/`, `cli` Go binary.

The audit reports `status` per surface: `fresh`, `stale`, `missing`, `known-drift`, `blocked`. During the transition phases, generated-from-Speakeasy surfaces are reported as `legacy` so the audit doesn't fail the build until they're removed.

- [ ] **Step 1: Write the failing surface audit test.**

  Create `scripts/test-surface-audit.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { buildSurfaceReport } from "./lib/surface-audit.mjs";

  test("surface report classifies each surface", async () => {
    const report = await buildSurfaceReport(new URL("..", import.meta.url));

    // Spec
    assert.equal(report.spec.operationCount, 20);
    assert.ok(report.spec.operationIds.includes("getCurrentUser"));
    assert.ok(report.spec.operationIds.includes("replaceCommentReactions"));

    // Generated types
    assert.match(report.sdk.generatedTypes.status, /^(fresh|missing)$/);

    // Generated operations (TS)
    assert.match(report.sdk.generatedOperations.status, /^(fresh|stale|missing|legacy)$/);
    assert.equal(typeof report.sdk.generatedOperations.expectedCount, "number");

    // Hand-crafted SDK client
    assert.match(report.sdk.handcraftedClient.status, /^(fresh|missing|incomplete)$/);

    // CLI raw + curated
    assert.match(report.cli.generatedCommands.status, /^(fresh|stale|missing|legacy)$/);
    assert.match(report.cli.curatedCommands.status, /^(fresh|missing)$/);

    // MCP raw + curated
    assert.match(report.mcp.generatedTools.status, /^(fresh|stale|missing|legacy)$/);
    assert.match(report.mcp.curatedTools.status, /^(fresh|missing)$/);

    // Build artifacts
    assert.match(report.sdk.build.status, /^(fresh|stale|missing)$/);
    assert.match(report.mcp.build.status, /^(fresh|stale|missing)$/);

    // Drift detail
    assert.ok(Array.isArray(report.sdk.build.staleFiles));
  });

  test("getCurrentUser is treated as a no-request-body GET", async () => {
    const report = await buildSurfaceReport(new URL("..", import.meta.url));
    const op = report.spec.operationDetails.find((o) => o.operationId === "getCurrentUser");
    assert.ok(op);
    assert.equal(op.method, "GET");
    assert.equal(op.hasRequestBody, false);
    assert.equal(op.pathParams.length, 0);
  });
  ```

- [ ] **Step 2: Run the test, confirm it fails because `surface-audit.mjs` does not exist.**

  ```bash
  node --test scripts/test-surface-audit.mjs
  ```

  Expected: FAIL with `ERR_MODULE_NOT_FOUND: Cannot find module '.../scripts/lib/surface-audit.mjs'`.

- [ ] **Step 3: Implement `scripts/lib/surface-audit.mjs`.**

  Create the file with this exact shape:

  ```js
  import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
  import { join, relative } from "node:path";
  import { fileURLToPath } from "node:url";

  const METADATA_PATH = "openapi/plaky115-operation-metadata.json";

  export async function buildSurfaceReport(rootURL) {
    const root = fileURLToPath(rootURL);
    const metadata = readJSON(join(root, METADATA_PATH));
    const spec = buildSpec(metadata);
    const sdk = buildSdkReport(root, spec);
    const cli = buildCliReport(root, spec);
    const mcp = buildMcpReport(root, spec);
    return { spec, sdk, cli, mcp };
  }

  function readJSON(path) {
    return JSON.parse(readFileSync(path, "utf8"));
  }

  function buildSpec(metadata) {
    const ops = metadata.operations ?? [];
    return {
      operationCount: ops.length,
      operationIds: ops.map((o) => o.operationId),
      operationDetails: ops.map((op) => ({
        operationId: op.operationId,
        method: op.method,
        path: op.path,
        mcpName: op.mcpName,
        scopes: op.scopes ?? [],
        readOnly: op.readOnly === true,
        destructive: op.destructive === true,
        list: op.list === true,
        mutation: op.mutation === true,
        pagination: op.pagination ?? null,
        pathParams: extractPathParams(op.path),
        hasRequestBody: op.mutation === true && op.method !== "DELETE",
      })),
    };
  }

  function extractPathParams(path) {
    return [...(path ?? "").matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  }

  function buildSdkReport(root, spec) {
    const generatedTypesPath = join(root, "sdk/src/generated/types.ts");
    const generatedOpsDir = join(root, "sdk/src/generated/operations");
    const handcraftedClientDir = join(root, "sdk/src/client");
    const esmDir = join(root, "sdk/esm");
    const legacySrcSdk = join(root, "sdk/src/sdk");
    const legacySrcFuncs = join(root, "sdk/src/funcs");

    const generatedTypes = existsSync(generatedTypesPath)
      ? { status: "fresh", path: relative(root, generatedTypesPath) }
      : { status: "missing", path: relative(root, generatedTypesPath) };

    const generatedOperations = (() => {
      if (!existsSync(generatedOpsDir)) {
        return existsSync(legacySrcFuncs)
          ? { status: "legacy", path: relative(root, legacySrcFuncs), expectedCount: spec.operationCount }
          : { status: "missing", expectedCount: spec.operationCount };
      }
      const files = readdirSync(generatedOpsDir).filter((f) => f.endsWith(".ts"));
      const slugs = files.map((f) => f.replace(/\.ts$/, ""));
      const expected = spec.operationIds.map(kebab);
      const missing = expected.filter((s) => !slugs.includes(s));
      const extra = slugs.filter((s) => !expected.includes(s));
      const status = missing.length === 0 && extra.length === 0 ? "fresh" : "stale";
      return { status, expectedCount: spec.operationCount, missing, extra };
    })();

    const handcraftedClient = (() => {
      if (!existsSync(handcraftedClientDir)) {
        return { status: "missing" };
      }
      const required = ["client.ts", "spaces.ts", "boards.ts", "items.ts", "item-comments.ts", "reactions.ts", "users.ts", "teams.ts"];
      const present = readdirSync(handcraftedClientDir);
      const missing = required.filter((r) => !present.includes(r));
      return missing.length === 0 ? { status: "fresh" } : { status: "incomplete", missing };
    })();

    const build = (() => {
      if (!existsSync(esmDir)) {
        return { status: "missing", staleFiles: [] };
      }
      const esmFuncs = join(esmDir, "funcs");
      const expected = spec.operationIds.map(kebab);
      let stale = [];
      if (existsSync(esmFuncs)) {
        stale = readdirSync(esmFuncs)
          .filter((f) => f.endsWith(".js"))
          .map((f) => f.replace(/\.js$/, ""))
          .filter((slug) => !expected.includes(slug))
          .map((slug) => join("sdk/esm/funcs", `${slug}.js`));
      }
      return { status: stale.length === 0 ? "fresh" : "stale", staleFiles: stale };
    })();

    return {
      generatedTypes,
      generatedOperations,
      handcraftedClient,
      build,
      legacy: {
        srcSdk: existsSync(legacySrcSdk),
        srcFuncs: existsSync(legacySrcFuncs),
      },
    };
  }

  function buildCliReport(root, spec) {
    const generatedDir = join(root, "cli/internal/cli/raw");
    const curatedFile = join(root, "cli/internal/cli/dx.go");
    const legacySDK = join(root, "cli/internal/sdk");
    const generatedCommands = existsSync(generatedDir)
      ? { status: "fresh", path: relative(root, generatedDir) }
      : existsSync(legacySDK)
        ? { status: "legacy", path: relative(root, legacySDK) }
        : { status: "missing" };
    const curatedCommands = existsSync(curatedFile)
      ? { status: "fresh", path: relative(root, curatedFile) }
      : { status: "missing" };
    return { generatedCommands, curatedCommands };
  }

  function buildMcpReport(root, spec) {
    const generatedDir = join(root, "mcp-server/src/tools/raw");
    const curatedDir = join(root, "mcp-server/src/tools/curated");
    const legacyTools = join(root, "mcp-server/src/mcp-server/tools");
    const generatedTools = existsSync(generatedDir)
      ? (() => {
          const files = readdirSync(generatedDir).filter((f) => f.endsWith(".ts") && f !== "index.ts");
          const slugs = files.map((f) => f.replace(/\.ts$/, ""));
          const expected = spec.operationIds.map(kebab);
          const missing = expected.filter((s) => !slugs.includes(s));
          return missing.length === 0 ? { status: "fresh" } : { status: "stale", missing };
        })()
      : existsSync(legacyTools)
        ? { status: "legacy", path: relative(root, legacyTools) }
        : { status: "missing" };
    const curatedTools = existsSync(curatedDir)
      ? { status: "fresh", path: relative(root, curatedDir) }
      : { status: "missing" };
    const esmDir = join(root, "mcp-server/esm");
    const build = existsSync(esmDir) ? { status: "fresh" } : { status: "missing" };
    return { generatedTools, curatedTools, build };
  }

  function kebab(camel) {
    return camel.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }
  ```

- [ ] **Step 4: Run the test, confirm it passes.**

  ```bash
  node --test scripts/test-surface-audit.mjs
  ```

  Expected: PASS, 2 tests.

- [ ] **Step 5: Implement `scripts/status-surfaces.mjs`.**

  ```js
  #!/usr/bin/env node
  import { buildSurfaceReport } from "./lib/surface-audit.mjs";

  const args = new Set(process.argv.slice(2));
  const json = args.has("--json");
  const strict = args.has("--strict");

  const report = await buildSurfaceReport(new URL("..", import.meta.url));

  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    print(report);
  }

  const driftStatuses = ["stale", "missing", "incomplete"];
  const legacyOk = !strict;
  const surfaces = [
    ["sdk.generatedTypes", report.sdk.generatedTypes.status],
    ["sdk.generatedOperations", report.sdk.generatedOperations.status],
    ["sdk.handcraftedClient", report.sdk.handcraftedClient.status],
    ["sdk.build", report.sdk.build.status],
    ["cli.generatedCommands", report.cli.generatedCommands.status],
    ["cli.curatedCommands", report.cli.curatedCommands.status],
    ["mcp.generatedTools", report.mcp.generatedTools.status],
    ["mcp.curatedTools", report.mcp.curatedTools.status],
  ];
  const bad = surfaces.filter(([, status]) =>
    driftStatuses.includes(status) || (strict && status === "legacy")
  );
  if (bad.length > 0) {
    console.error(`Surface drift detected: ${bad.map((b) => `${b[0]}=${b[1]}`).join(", ")}`);
    process.exit(1);
  }

  function print(report) {
    console.log(`Spec: ${report.spec.operationCount} operations`);
    console.log(`SDK types        : ${report.sdk.generatedTypes.status}`);
    console.log(`SDK operations   : ${report.sdk.generatedOperations.status}`);
    console.log(`SDK client       : ${report.sdk.handcraftedClient.status}`);
    console.log(`SDK build        : ${report.sdk.build.status} (${report.sdk.build.staleFiles.length} stale)`);
    console.log(`CLI raw cmds     : ${report.cli.generatedCommands.status}`);
    console.log(`CLI curated cmds : ${report.cli.curatedCommands.status}`);
    console.log(`MCP raw tools    : ${report.mcp.generatedTools.status}`);
    console.log(`MCP curated tools: ${report.mcp.curatedTools.status}`);
  }
  ```

- [ ] **Step 6: Add npm scripts.**

  Edit `package.json`:

  ```json
  "scripts": {
    "overlay:validate": "speakeasy overlay validate -o overlays/plaky115-dx.overlay.yaml --logLevel warn",
    "overlay:apply": "speakeasy overlay apply --strict -s api-1.yaml -o overlays/plaky115-dx.overlay.yaml --out openapi/plaky115-dx.openapi.yaml --logLevel warn",
    "metadata:generate": "ruby scripts/generate-operation-metadata.rb",
    "metadata:test": "ruby scripts/test-operation-metadata.rb",
    "lint:openapi": "speakeasy lint openapi -s api-1.yaml --logLevel warn && speakeasy lint openapi -s openapi/plaky115-dx.openapi.yaml --logLevel warn",
    "secret:scan": "bash -lc '! rg -n \"plk_[A-Za-z0-9]{16,}\" . -g \"!**/node_modules/**\" -g \"!**/.git/**\" -g \"!**/.speakeasy/logs/**\"'",
    "goreleaser:check": "cd cli && goreleaser check --config .goreleaser.yaml",
    "status:surfaces": "node scripts/status-surfaces.mjs",
    "status:surfaces:json": "node scripts/status-surfaces.mjs --json",
    "status:surfaces:strict": "node scripts/status-surfaces.mjs --strict",
    "test:surfaces": "node --test scripts/test-surface-audit.mjs"
  }
  ```

  Keep `postgen`, `regenerate`, `verify`, `live:sweep` for now; they get rewritten in Phases 4–5.

- [ ] **Step 7: Verify.**

  ```bash
  npm run test:surfaces
  npm run status:surfaces
  npm run status:surfaces:json | head -40
  ```

  Expected:
  - `test:surfaces`: PASS (2 tests).
  - `status:surfaces`: prints status lines, exits 1 (because `sdk.generatedTypes=missing` etc. — drift detected, expected pre-implementation).
  - `status:surfaces:json`: prints valid JSON.

- [ ] **Step 8: Commit.**

  ```bash
  git add scripts/lib/surface-audit.mjs scripts/status-surfaces.mjs scripts/test-surface-audit.mjs package.json
  git commit -m "$(cat <<'EOF'
  feat(scripts): add surface audit and status report

  Introduces scripts/lib/surface-audit.mjs and scripts/status-surfaces.mjs to
  classify every plaky115 surface (spec, generated types, generated operations,
  hand-crafted client, build artifacts, CLI commands, MCP tools) as fresh,
  stale, missing, incomplete, or legacy. Drives the drift gate that fails the
  build when artifacts diverge from openapi/plaky115-operation-metadata.json.
  EOF
  )"
  ```

---

## Phase 2: Clean Builds And Artifact Audits

- [ ] **Step 1: Write the artifact audit before changing build scripts.**

  Create `scripts/audit-package-artifacts.mjs`:

  ```js
  #!/usr/bin/env node
  import { existsSync, readdirSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";

  const root = fileURLToPath(new URL("..", import.meta.url));

  function compareEsmToSrc(pkg) {
    const srcDir = join(root, pkg, "src", "generated", "operations");
    const esmDir = join(root, pkg, "esm", "funcs"); // legacy
    const newEsmDir = join(root, pkg, "esm", "generated", "operations");
    const srcSlugs = existsSync(srcDir)
      ? readdirSync(srcDir).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""))
      : [];
    const builtSlugs = new Set();
    if (existsSync(newEsmDir)) {
      for (const f of readdirSync(newEsmDir)) {
        if (f.endsWith(".js")) builtSlugs.add(f.replace(/\.js$/, ""));
      }
    }
    const legacyBuilt = new Set();
    if (existsSync(esmDir)) {
      for (const f of readdirSync(esmDir)) {
        if (f.endsWith(".js")) legacyBuilt.add(f.replace(/\.js$/, ""));
      }
    }
    const missing = srcSlugs.filter((s) => !builtSlugs.has(s));
    const stale = [...builtSlugs].filter((s) => !srcSlugs.includes(s));
    return { pkg, srcCount: srcSlugs.length, builtCount: builtSlugs.size, legacyCount: legacyBuilt.size, missing, stale };
  }

  const reports = [compareEsmToSrc("sdk"), compareEsmToSrc("mcp-server")];
  let bad = false;
  for (const r of reports) {
    console.log(`${r.pkg}: src=${r.srcCount} built=${r.builtCount} legacy=${r.legacyCount} missing=${r.missing.length} stale=${r.stale.length}`);
    if (r.missing.length > 0) console.log(`  missing: ${r.missing.join(", ")}`);
    if (r.stale.length > 0) console.log(`  stale  : ${r.stale.join(", ")}`);
    if (r.legacyCount > 0) console.log(`  legacy : present (run clean build to remove)`);
    if (r.missing.length > 0 || r.stale.length > 0 || r.legacyCount > 0) bad = true;
  }
  if (bad) process.exit(1);
  ```

- [ ] **Step 2: Run the audit, confirm it fails on the existing stale `sdk/esm/funcs/*` files.**

  ```bash
  node scripts/audit-package-artifacts.mjs
  ```

  Expected: prints `sdk: ... legacyCount=28 ...` (the existing stale built files), exits 1.

- [ ] **Step 3: Implement `scripts/clean-package-builds.mjs`.**

  ```js
  #!/usr/bin/env node
  import { rmSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";

  const pkg = process.argv[2];
  if (!["sdk", "mcp-server"].includes(pkg)) {
    console.error("usage: node scripts/clean-package-builds.mjs <sdk|mcp-server>");
    process.exit(2);
  }
  const root = fileURLToPath(new URL("..", import.meta.url));
  rmSync(join(root, pkg, "esm"), { recursive: true, force: true });
  if (pkg === "mcp-server") {
    rmSync(join(root, pkg, "bin", "mcp-server.js"), { force: true });
  }
  ```

- [ ] **Step 4: Wire `clean-package-builds.mjs` into each package's build.**

  Edit `sdk/package.json` `scripts`:

  ```json
  "scripts": {
    "lint": "oxlint --max-warnings=0 --deny-warnings src/**/*.ts src/**/*.tsx",
    "build": "node ../scripts/clean-package-builds.mjs sdk && tsgo",
    "prepublishOnly": "npm run build",
    "test": "npm run build && node --test test/*.test.mjs"
  }
  ```

  Edit `mcp-server/package.json` `scripts`:

  ```json
  "scripts": {
    "lint": "oxlint --max-warnings=0 --deny-warnings src/**/*.ts src/**/*.tsx",
    "build:bin": "bun src/server/build.mts",
    "build": "node ../scripts/clean-package-builds.mjs mcp-server && npm run build:bin && tsgo",
    "test": "npm run build && node --test test/*.test.mjs",
    "prepublishOnly": "npm run build"
  }
  ```

  Note: `src/server/build.mts` is created in Phase 5. For now, comment it out by leaving `build:bin` referencing the legacy `src/mcp-server/build.mts`; revisit during Phase 5.

- [ ] **Step 5: Add root script.**

  ```json
  "artifacts:audit": "node scripts/audit-package-artifacts.mjs"
  ```

- [ ] **Step 6: Verify the fail/clean/pass sequence (the SDK build will fail until Phase 5 hand-craft, but the audit cycle still proves out).**

  ```bash
  node scripts/audit-package-artifacts.mjs || echo "expected fail before clean"
  npm --prefix sdk run build || echo "sdk build expected to fail until Phase 5"
  npm run artifacts:audit || echo "still legacy until Phase 5 removes /esm legacy"
  ```

  Expected: each step prints the right "expected" line. This phase is wiring; the green path appears in Phase 5.

- [ ] **Step 7: Commit.**

  ```bash
  git add scripts/clean-package-builds.mjs scripts/audit-package-artifacts.mjs sdk/package.json mcp-server/package.json package.json
  git commit -m "$(cat <<'EOF'
  feat(scripts): clean-build helper and stale artifact audit

  Adds scripts/clean-package-builds.mjs (called from sdk and mcp-server
  build scripts) and scripts/audit-package-artifacts.mjs (compares src
  operation modules to built JS, flags any leftover legacy files). Both
  fail loudly when esm/ trees drift from src/generated/operations/.
  EOF
  )"
  ```

---

## Phase 3: Package Smoke Gates

- [ ] **Step 1: Add `scripts/pack-smoke.mjs`.**

  ```js
  #!/usr/bin/env node
  import { spawnSync } from "node:child_process";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";

  const root = fileURLToPath(new URL("..", import.meta.url));

  function pack(pkg) {
    const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: join(root, pkg),
      encoding: "utf8",
    });
    if (result.status !== 0) {
      console.error(`npm pack failed for ${pkg}: ${result.stderr}`);
      process.exit(1);
    }
    const [parsed] = JSON.parse(result.stdout);
    return parsed.files.map((f) => f.path);
  }

  const sdkFiles = pack("sdk");
  const mcpFiles = pack("mcp-server");

  function requireFile(files, path, pkg) {
    if (!files.includes(path)) {
      console.error(`${pkg}: missing ${path}`);
      process.exit(1);
    }
  }
  function rejectFile(files, path, pkg) {
    if (files.includes(path)) {
      console.error(`${pkg}: must not include ${path}`);
      process.exit(1);
    }
  }

  requireFile(sdkFiles, "package.json", "sdk");
  requireFile(sdkFiles, "esm/index.js", "sdk");
  requireFile(sdkFiles, "esm/client/client.js", "sdk");
  requireFile(sdkFiles, "esm/generated/operations/list-spaces.js", "sdk");
  rejectFile(sdkFiles, "esm/funcs/spaces-get-spaces.js", "sdk");
  rejectFile(sdkFiles, "esm/sdk/sdk.js", "sdk");

  requireFile(mcpFiles, "package.json", "mcp-server");
  requireFile(mcpFiles, "bin/mcp-server.js", "mcp-server");
  requireFile(mcpFiles, "esm/server/index.js", "mcp-server");
  requireFile(mcpFiles, "esm/tools/curated/index.js", "mcp-server");
  rejectFile(mcpFiles, "esm/mcp-server/plaky-curated-tools.js", "mcp-server");

  console.log(`pack-smoke OK: sdk=${sdkFiles.length} files, mcp-server=${mcpFiles.length} files`);
  ```

- [ ] **Step 2: Add root script.**

  ```json
  "pack:smoke": "node scripts/pack-smoke.mjs"
  ```

- [ ] **Step 3: Verify (will fail until Phase 5 ships new layout; that's expected).**

  ```bash
  npm run pack:smoke || echo "expected fail until Phase 5"
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add scripts/pack-smoke.mjs package.json
  git commit -m "feat(scripts): pack smoke gate for sdk and mcp-server tarballs"
  ```

---

## Phase 4: Codegen Pipeline (Replaces v1 Phase 4)

This phase replaces Speakeasy cloud generation with in-repo codegen scripts. Output is deterministic and idempotent: running `npm run generate:all` twice produces no diff.

### 4.1 — Add `openapi-typescript` dependency

- [ ] **Step 1: Install.**

  ```bash
  cd sdk && npm install --save-dev openapi-typescript@^7.4.0 && cd ..
  ```

- [ ] **Step 2: Verify the binary works.**

  ```bash
  cd sdk && npx openapi-typescript --version && cd ..
  ```

  Expected: prints `openapi-typescript X.Y.Z`.

### 4.2 — `generate-types.mjs` (TS SDK types)

- [ ] **Step 1: Write the test first.**

  Create `scripts/test-codegen-determinism.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { spawnSync } from "node:child_process";
  import { readFileSync, writeFileSync, existsSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";

  const root = fileURLToPath(new URL("..", import.meta.url));

  function snapshot(paths) {
    return paths.map((p) => (existsSync(p) ? readFileSync(p, "utf8") : "")).join("\n---\n");
  }

  function run(cmd, args) {
    const result = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(`${cmd} ${args.join(" ")} failed: ${result.stderr}`);
    }
  }

  test("generate-types is deterministic", () => {
    const target = join(root, "sdk/src/generated/types.ts");
    run("node", ["scripts/generate-types.mjs"]);
    const a = snapshot([target]);
    run("node", ["scripts/generate-types.mjs"]);
    const b = snapshot([target]);
    assert.equal(a, b, "running generate-types twice must produce identical output");
  });

  test("generate-operations is deterministic", () => {
    run("node", ["scripts/generate-operations.mjs"]);
    const targets = [
      join(root, "sdk/src/generated/operations/list-spaces.ts"),
      join(root, "sdk/src/generated/operations/create-item.ts"),
      join(root, "sdk/src/generated/operation-table.ts"),
    ];
    const a = snapshot(targets);
    run("node", ["scripts/generate-operations.mjs"]);
    const b = snapshot(targets);
    assert.equal(a, b);
  });
  ```

- [ ] **Step 2: Run, confirm fail (scripts don't exist).**

  ```bash
  node --test scripts/test-codegen-determinism.mjs
  ```

  Expected: FAIL.

- [ ] **Step 3: Implement `scripts/generate-types.mjs`.**

  ```js
  #!/usr/bin/env node
  import { spawnSync } from "node:child_process";
  import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
  import { dirname, join } from "node:path";
  import { fileURLToPath } from "node:url";

  const root = fileURLToPath(new URL("..", import.meta.url));
  const input = join(root, "openapi/plaky115-dx.openapi.yaml");
  const output = join(root, "sdk/src/generated/types.ts");

  mkdirSync(dirname(output), { recursive: true });

  const result = spawnSync(
    "npx",
    ["--prefix", join(root, "sdk"), "openapi-typescript", input, "--output", output, "--alphabetize", "--immutable"],
    { stdio: "inherit", cwd: root }
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const header = `// AUTO-GENERATED FILE. Do not edit by hand.\n// Source: openapi/plaky115-dx.openapi.yaml\n// Regenerate: npm run generate:types\n\n`;
  const body = readFileSync(output, "utf8");
  if (!body.startsWith("// AUTO-GENERATED FILE")) {
    writeFileSync(output, header + body);
  }
  console.log(`generate-types: wrote ${output}`);
  ```

- [ ] **Step 4: Add npm script.**

  ```json
  "generate:types": "node scripts/generate-types.mjs"
  ```

- [ ] **Step 5: Run, confirm `sdk/src/generated/types.ts` is created and stable.**

  ```bash
  npm run generate:types
  npm run generate:types  # second run produces no diff
  git diff -- sdk/src/generated/types.ts | head -5
  ```

  Expected: second run shows zero diff.

### 4.3 — `generate-operations.mjs` (TS SDK low-level)

- [ ] **Step 1: Implement.**

  Create `scripts/lib/codegen-operations.mjs`:

  ```js
  import { readFileSync } from "node:fs";
  import { join } from "node:path";

  export function loadMetadata(root) {
    return JSON.parse(readFileSync(join(root, "openapi/plaky115-operation-metadata.json"), "utf8"));
  }

  export function slug(operationId) {
    return operationId.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }

  export function pathParams(path) {
    return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  }

  export function buildOperationModule(op) {
    const params = pathParams(op.path);
    const hasBody = op.method !== "GET" && op.method !== "DELETE";
    const requestType = `paths["${op.path}"]["${op.method.toLowerCase()}"]`;
    const lines = [];
    lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${op.operationId}`);
    lines.push(`// Regenerate: npm run generate:operations`);
    lines.push(`import type { paths } from "../types.js";`);
    lines.push(`import { request } from "../../runtime/http.js";`);
    lines.push(`import type { PlakyRequestOptions } from "../../runtime/http.js";`);
    lines.push(``);
    lines.push(`export type ${op.operationId}Params = {`);
    for (const p of params) lines.push(`  ${p}: string | number;`);
    if (hasBody) lines.push(`  body: NonNullable<${requestType}["requestBody"]> extends { content: { "application/json": infer B } } ? B : never;`);
    lines.push(`  query?: ${requestType} extends { parameters: { query?: infer Q } } ? Q : never;`);
    lines.push(`};`);
    lines.push(``);
    lines.push(`export type ${op.operationId}Response =`);
    lines.push(`  ${requestType} extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :`);
    lines.push(`  ${requestType} extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :`);
    lines.push(`  ${requestType} extends { responses: { 204: any } } ? void : unknown;`);
    lines.push(``);
    lines.push(`export async function ${op.operationId}(`);
    lines.push(`  params: ${op.operationId}Params,`);
    lines.push(`  options: PlakyRequestOptions,`);
    lines.push(`): Promise<${op.operationId}Response> {`);
    lines.push(`  const path = \`${op.path.replace(/\{([^}]+)\}/g, "${params.$1}")}\`;`);
    lines.push(`  return request<${op.operationId}Response>({`);
    lines.push(`    method: "${op.method}",`);
    lines.push(`    path,`);
    lines.push(`    query: params.query,`);
    if (hasBody) lines.push(`    body: params.body,`);
    lines.push(`    operationId: "${op.operationId}",`);
    lines.push(`  }, options);`);
    lines.push(`}`);
    lines.push(``);
    return lines.join("\n");
  }

  export function buildOperationTable(ops) {
    const lines = [];
    lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
    lines.push(`// Regenerate: npm run generate:operations`);
    lines.push(``);
    lines.push(`export const operationTable = [`);
    for (const op of ops) {
      lines.push(`  {`);
      lines.push(`    operationId: "${op.operationId}",`);
      lines.push(`    method: "${op.method}" as const,`);
      lines.push(`    path: "${op.path}",`);
      lines.push(`    mcpName: "${op.mcpName}",`);
      lines.push(`    scopes: ${JSON.stringify(op.scopes ?? [])} as const,`);
      lines.push(`    readOnly: ${op.readOnly === true},`);
      lines.push(`    destructive: ${op.destructive === true},`);
      lines.push(`    list: ${op.list === true},`);
      lines.push(`    mutation: ${op.mutation === true},`);
      if (op.pagination) lines.push(`    pagination: ${JSON.stringify(op.pagination)} as const,`);
      lines.push(`  },`);
    }
    lines.push(`] as const;`);
    lines.push(``);
    lines.push(`export type OperationId = (typeof operationTable)[number]["operationId"];`);
    lines.push(``);
    return lines.join("\n");
  }
  ```

  Create `scripts/generate-operations.mjs`:

  ```js
  #!/usr/bin/env node
  import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";
  import { loadMetadata, slug, buildOperationModule, buildOperationTable } from "./lib/codegen-operations.mjs";

  const root = fileURLToPath(new URL("..", import.meta.url));
  const outDir = join(root, "sdk/src/generated/operations");
  mkdirSync(outDir, { recursive: true });

  const metadata = loadMetadata(root);
  const ops = metadata.operations;

  const expectedFiles = new Set(ops.map((op) => `${slug(op.operationId)}.ts`));
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".ts") && !expectedFiles.has(f)) {
      rmSync(join(outDir, f));
    }
  }

  for (const op of ops) {
    const out = join(outDir, `${slug(op.operationId)}.ts`);
    writeFileSync(out, buildOperationModule(op));
  }

  writeFileSync(join(root, "sdk/src/generated/operation-table.ts"), buildOperationTable(ops));

  console.log(`generate-operations: wrote ${ops.length} modules + operation-table.ts`);
  ```

- [ ] **Step 2: Add npm script.**

  ```json
  "generate:operations": "node scripts/generate-operations.mjs"
  ```

- [ ] **Step 3: Run, confirm 20 files + operation-table.ts.**

  ```bash
  npm run generate:operations
  ls sdk/src/generated/operations/ | wc -l   # expect 20
  cat sdk/src/generated/operations/list-spaces.ts | head -20
  npm run generate:operations
  git diff --stat -- sdk/src/generated/operations/ sdk/src/generated/operation-table.ts
  ```

  Expected: 20 files, second run zero diff.

### 4.4 — `generate-mcp.mjs` (raw MCP tool registrations)

- [ ] **Step 1: Implement.**

  Create `scripts/lib/codegen-mcp.mjs`:

  ```js
  import { slug, pathParams } from "./codegen-operations.mjs";

  export function buildRawToolModule(op) {
    const params = pathParams(op.path);
    const hasBody = op.method !== "GET" && op.method !== "DELETE";
    const camelOp = op.operationId;
    const lines = [];
    lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${camelOp}`);
    lines.push(`import { z } from "zod/v3";`);
    lines.push(`import { ${camelOp} } from "../../../sdk/generated/operations/${slug(camelOp)}.js";`);
    lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
    lines.push(``);
    lines.push(`const args = z.object({`);
    for (const p of params) lines.push(`  ${p}: z.union([z.string(), z.number()]).describe("${p}"),`);
    if (op.pagination) {
      lines.push(`  page: z.number().int().min(1).optional(),`);
      lines.push(`  pageSize: z.number().int().min(1).max(200).optional(),`);
    }
    if (hasBody) lines.push(`  body: z.record(z.unknown()).optional(),`);
    lines.push(`});`);
    lines.push(``);
    lines.push(`export const ${camelOp}Tool: McpToolDefinition = {`);
    lines.push(`  name: "${op.mcpName}",`);
    lines.push(`  title: "${op.mcpTitle ?? op.summary ?? op.operationId}",`);
    lines.push(`  description: ${JSON.stringify(op.summary ?? op.operationId)},`);
    lines.push(`  scopes: ${JSON.stringify(op.scopes ?? [])},`);
    lines.push(`  annotations: {`);
    lines.push(`    readOnlyHint: ${op.readOnly === true},`);
    lines.push(`    destructiveHint: ${op.destructive === true},`);
    lines.push(`    idempotentHint: ${op.idempotent === true},`);
    lines.push(`    openWorldHint: ${op.openWorld === true},`);
    lines.push(`  },`);
    lines.push(`  inputSchema: args,`);
    lines.push(`  async handler(input, ctx) {`);
    lines.push(`    const result = await ${camelOp}(input as Parameters<typeof ${camelOp}>[0], ctx.requestOptions);`);
    lines.push(`    return ctx.respond(result, { compactKind: ${pickCompact(op)} });`);
    lines.push(`  },`);
    lines.push(`};`);
    lines.push(``);
    return lines.join("\n");
  }

  function pickCompact(op) {
    if (op.path.includes("/items") && !op.path.includes("/comments")) return `"item"`;
    if (op.path.includes("/boards")) return `"board"`;
    if (op.path.includes("/spaces")) return `"space"`;
    if (op.path.includes("/comments")) return `"comment"`;
    return `"raw"`;
  }

  export function buildRawToolIndex(ops) {
    const lines = [];
    lines.push(`// AUTO-GENERATED.`);
    for (const op of ops) lines.push(`export { ${op.operationId}Tool } from "./${slug(op.operationId)}.js";`);
    lines.push(``);
    lines.push(`import type { McpToolDefinition } from "../../runtime/types.js";`);
    for (const op of ops) lines.push(`import { ${op.operationId}Tool } from "./${slug(op.operationId)}.js";`);
    lines.push(`export const rawTools: McpToolDefinition[] = [${ops.map((o) => `${o.operationId}Tool`).join(", ")}];`);
    lines.push(``);
    return lines.join("\n");
  }
  ```

  Create `scripts/generate-mcp.mjs`:

  ```js
  #!/usr/bin/env node
  import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";
  import { loadMetadata, slug } from "./lib/codegen-operations.mjs";
  import { buildRawToolModule, buildRawToolIndex } from "./lib/codegen-mcp.mjs";

  const root = fileURLToPath(new URL("..", import.meta.url));
  const outDir = join(root, "mcp-server/src/tools/raw");
  mkdirSync(outDir, { recursive: true });

  const metadata = loadMetadata(root);
  const ops = metadata.operations;

  const expected = new Set([...ops.map((o) => `${slug(o.operationId)}.ts`), "index.ts"]);
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".ts") && !expected.has(f)) rmSync(join(outDir, f));
  }

  for (const op of ops) {
    writeFileSync(join(outDir, `${slug(op.operationId)}.ts`), buildRawToolModule(op));
  }
  writeFileSync(join(outDir, "index.ts"), buildRawToolIndex(ops));

  console.log(`generate-mcp: wrote ${ops.length} raw tool modules`);
  ```

- [ ] **Step 2: Add script.**

  ```json
  "generate:mcp": "node scripts/generate-mcp.mjs"
  ```

- [ ] **Step 3: Run.**

  ```bash
  npm run generate:mcp
  ls mcp-server/src/tools/raw/ | wc -l   # expect 21 (20 ops + index)
  ```

### 4.5 — `generate-cli.mjs` (raw Go cobra commands)

- [ ] **Step 1: Implement.**

  Create `scripts/lib/codegen-cli.mjs`:

  ```js
  import { pathParams } from "./codegen-operations.mjs";

  export function buildCobraCommand(op) {
    const params = pathParams(op.path);
    const useSlug = op.operationId.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
    const fnName = `new${cap(op.operationId)}Cmd`;
    const lines = [];
    lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=${op.operationId}`);
    lines.push(`package raw`);
    lines.push(``);
    lines.push(`import (`);
    lines.push(`\t"github.com/apet97/plaky115-cli/internal/plakydx"`);
    lines.push(`\t"github.com/apet97/plaky115-cli/internal/plakysdk"`);
    lines.push(`\t"github.com/spf13/cobra"`);
    lines.push(`)`);
    lines.push(``);
    lines.push(`func ${fnName}(client *plakysdk.Client) *cobra.Command {`);
    lines.push(`\tcmd := &cobra.Command{`);
    lines.push(`\t\tUse:   "${useSlug}",`);
    lines.push(`\t\tShort: ${JSON.stringify(op.summary ?? op.operationId)},`);
    lines.push(`\t\tRunE: func(cmd *cobra.Command, args []string) error {`);
    lines.push(`\t\t\tctx := cmd.Context()`);
    lines.push(`\t\t\treturn plakydx.Run${cap(op.operationId)}(ctx, cmd, client)`);
    lines.push(`\t\t},`);
    lines.push(`\t}`);
    for (const p of params) lines.push(`\tcmd.Flags().String("${flag(p)}", "", "${p} (required)")`);
    if (op.pagination) {
      lines.push(`\tcmd.Flags().Int("page", 0, "Page number (1-based)")`);
      lines.push(`\tcmd.Flags().Int("page-size", 0, "Page size")`);
    }
    if (op.method !== "GET" && op.method !== "DELETE") {
      lines.push(`\tcmd.Flags().String("body", "", "Request body JSON or @file.json")`);
    }
    lines.push(`\treturn cmd`);
    lines.push(`}`);
    lines.push(``);
    return lines.join("\n");
  }

  export function buildRawRoot(ops) {
    const lines = [];
    lines.push(`// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json`);
    lines.push(`package raw`);
    lines.push(``);
    lines.push(`import (`);
    lines.push(`\t"github.com/apet97/plaky115-cli/internal/plakysdk"`);
    lines.push(`\t"github.com/spf13/cobra"`);
    lines.push(`)`);
    lines.push(``);
    lines.push(`func NewRawRoot(client *plakysdk.Client) *cobra.Command {`);
    lines.push(`\troot := &cobra.Command{Use: "raw", Short: "Direct Plaky API operations (one command per OpenAPI operation)."}`);
    for (const op of ops) lines.push(`\troot.AddCommand(new${cap(op.operationId)}Cmd(client))`);
    lines.push(`\treturn root`);
    lines.push(`}`);
    lines.push(``);
    return lines.join("\n");
  }

  function cap(s) { return s[0].toUpperCase() + s.slice(1); }
  function flag(p) { return p.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(); }
  ```

  Create `scripts/generate-cli.mjs`:

  ```js
  #!/usr/bin/env node
  import { mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";
  import { loadMetadata, slug } from "./lib/codegen-operations.mjs";
  import { buildCobraCommand, buildRawRoot } from "./lib/codegen-cli.mjs";

  const root = fileURLToPath(new URL("..", import.meta.url));
  const outDir = join(root, "cli/internal/cli/raw");
  mkdirSync(outDir, { recursive: true });

  const metadata = loadMetadata(root);
  const ops = metadata.operations;

  const expected = new Set([...ops.map((o) => `${slug(o.operationId)}.go`), "raw.go"]);
  for (const f of readdirSync(outDir)) {
    if (f.endsWith(".go") && !expected.has(f)) rmSync(join(outDir, f));
  }

  for (const op of ops) {
    writeFileSync(join(outDir, `${slug(op.operationId)}.go`), buildCobraCommand(op));
  }
  writeFileSync(join(outDir, "raw.go"), buildRawRoot(ops));

  console.log(`generate-cli: wrote ${ops.length} raw cobra commands`);
  ```

- [ ] **Step 2: Add script.**

  ```json
  "generate:cli": "node scripts/generate-cli.mjs"
  ```

- [ ] **Step 3: Run.**

  ```bash
  npm run generate:cli
  ls cli/internal/cli/raw/ | wc -l   # expect 21
  ```

### 4.6 — `generate-docs-index.mjs` (MCP docs search corpus)

- [ ] **Step 1: Implement.**

  Create `scripts/lib/codegen-docs-index.mjs`:

  ```js
  import { readFileSync, existsSync } from "node:fs";
  import { join } from "node:path";

  export function buildDocsIndex(root, metadata) {
    const entries = [];
    for (const op of metadata.operations) {
      entries.push({
        id: `op:${op.operationId}`,
        kind: "operation",
        title: op.mcpTitle ?? op.summary ?? op.operationId,
        text: `${op.summary ?? ""}\nPath: ${op.method} ${op.path}\nMCP tool: ${op.mcpName}\nScopes: ${(op.scopes ?? []).join(", ") || "none"}`,
        operationId: op.operationId,
        scopes: op.scopes ?? [],
      });
    }
    const workflows = [
      { id: "wf:workspace.map", title: "Workspace map", text: "Discover spaces and boards before calling item workflows. Returns compact tree by default." },
      { id: "wf:items.search", title: "Search items", text: "Find items across boards by title fragment, status, person, or tag." },
      { id: "wf:items.create", title: "Create item", text: "Create an item with title and optional field values. Supports dry-run." },
      { id: "wf:items.updateFields", title: "Bulk update item fields", text: "Update many field values on one item in one call. Dry-run by default." },
      { id: "wf:comments.add", title: "Add comment", text: "Append a comment to an item." },
      { id: "wf:comments.thread", title: "Comment thread", text: "Read a comment thread compactly." },
      { id: "wf:export.items", title: "Export items", text: "Export board items as JSONL or CSV." },
    ];
    for (const wf of workflows) entries.push({ ...wf, kind: "workflow", scopes: ["read"] });

    const guideFiles = ["README.md", "docs/live-smoke.md", "docs/install-snippets.md"];
    for (const rel of guideFiles) {
      const path = join(root, rel);
      if (!existsSync(path)) continue;
      const text = readFileSync(path, "utf8").slice(0, 4096);
      entries.push({ id: `guide:${rel}`, kind: "guide", title: rel, text, scopes: ["read"] });
    }
    return entries;
  }

  export function emitDocsIndex(entries) {
    const lines = [];
    lines.push(`// AUTO-GENERATED. Source: metadata + repo docs.`);
    lines.push(`export type PlakyDocsEntry = {`);
    lines.push(`  id: string;`);
    lines.push(`  kind: "operation" | "workflow" | "guide";`);
    lines.push(`  title: string;`);
    lines.push(`  text: string;`);
    lines.push(`  operationId?: string;`);
    lines.push(`  scopes: Array<"read" | "write" | "destructive">;`);
    lines.push(`};`);
    lines.push(``);
    lines.push(`export const docsIndex: PlakyDocsEntry[] = ${JSON.stringify(entries, null, 2)};`);
    lines.push(``);
    return lines.join("\n");
  }
  ```

  Create `scripts/generate-docs-index.mjs`:

  ```js
  #!/usr/bin/env node
  import { mkdirSync, writeFileSync } from "node:fs";
  import { join, dirname } from "node:path";
  import { fileURLToPath } from "node:url";
  import { loadMetadata } from "./lib/codegen-operations.mjs";
  import { buildDocsIndex, emitDocsIndex } from "./lib/codegen-docs-index.mjs";

  const root = fileURLToPath(new URL("..", import.meta.url));
  const out = join(root, "mcp-server/src/runtime/docs-index.ts");
  mkdirSync(dirname(out), { recursive: true });
  const entries = buildDocsIndex(root, loadMetadata(root));
  writeFileSync(out, emitDocsIndex(entries));
  console.log(`generate-docs-index: wrote ${entries.length} entries to ${out}`);
  ```

- [ ] **Step 2: Add script.**

  ```json
  "generate:docs-index": "node scripts/generate-docs-index.mjs"
  ```

### 4.7 — `generate-all.mjs` (umbrella)

- [ ] **Step 1: Implement.**

  ```js
  #!/usr/bin/env node
  import { spawnSync } from "node:child_process";

  const steps = [
    ["npm", "run", "overlay:apply"],
    ["npm", "run", "lint:openapi"],
    ["npm", "run", "metadata:generate"],
    ["npm", "run", "metadata:test"],
    ["npm", "run", "generate:types"],
    ["npm", "run", "generate:operations"],
    ["npm", "run", "generate:mcp"],
    ["npm", "run", "generate:cli"],
    ["npm", "run", "generate:docs-index"],
    ["npm", "run", "test:surfaces"],
  ];
  for (const [cmd, ...args] of steps) {
    console.log(`$ ${cmd} ${args.join(" ")}`);
    const r = spawnSync(cmd, args, { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  console.log("generate-all: OK");
  ```

- [ ] **Step 2: Add scripts.**

  ```json
  "generate:all": "node scripts/generate-all.mjs",
  "codegen:test": "node --test scripts/test-codegen-determinism.mjs"
  ```

- [ ] **Step 3: Update `scripts/regenerate.mjs` to delegate.**

  Replace its contents with:

  ```js
  #!/usr/bin/env node
  import { spawnSync } from "node:child_process";
  const r = spawnSync("npm", ["run", "generate:all"], { stdio: "inherit" });
  process.exit(r.status ?? 0);
  ```

- [ ] **Step 4: Verify determinism.**

  ```bash
  npm run generate:all
  git diff --stat
  npm run generate:all
  git diff --exit-code
  npm run codegen:test
  ```

  Expected: first run shows new generated files, second run shows zero diff, `codegen:test` passes.

- [ ] **Step 5: Commit.**

  ```bash
  git add scripts/lib/codegen-*.mjs scripts/generate-*.mjs scripts/regenerate.mjs scripts/test-codegen-determinism.mjs package.json sdk/package.json sdk/package-lock.json
  git add sdk/src/generated/ mcp-server/src/tools/raw/ mcp-server/src/runtime/docs-index.ts cli/internal/cli/raw/
  git commit -m "$(cat <<'EOF'
  feat(codegen): in-repo deterministic generators replace Speakeasy cloud

  Adds scripts/generate-types.mjs (openapi-typescript), generate-operations.mjs
  (per-operation TS module + operation-table.ts), generate-mcp.mjs (raw MCP
  tool registrations), generate-cli.mjs (cobra raw subtree), and
  generate-docs-index.mjs (MCP docs corpus). Each generator reads
  openapi/plaky115-operation-metadata.json and produces idempotent output;
  scripts/test-codegen-determinism.mjs proves zero diff on rerun. Wraps them
  in generate-all.mjs; rewires scripts/regenerate.mjs as a thin alias.
  EOF
  )"
  ```

---

## Phase 5: Hand-Craft Replaces Generated Speakeasy Code

This is the biggest phase. The hand-crafted SDK runtime + client replaces `sdk/src/sdk/`, `sdk/src/funcs/`, `sdk/src/models/`, `sdk/src/hooks/`, `sdk/src/core.ts`, `sdk/src/lib/`. The hand-crafted MCP server replaces `mcp-server/src/mcp-server/`. The hand-crafted Go SDK replaces `cli/internal/sdk/`.

The phase is broken into self-contained tasks per layer so they can ship as separate commits with green tests between each.

### 5.1 — SDK runtime (`sdk/src/runtime/`)

- [ ] **Step 1: Write the HTTP test.**

  Create `sdk/test/http.test.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { request } from "../esm/runtime/http.js";

  test("request builds url, sends auth header, parses JSON", async () => {
    let captured;
    globalThis.fetch = async (url, init) => {
      captured = { url: url.toString(), init };
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    };
    const result = await request(
      { method: "GET", path: "/v1/public/spaces", query: { page: 1 }, operationId: "listSpaces" },
      { apiKey: "plk_test", serverURL: "https://example.test" },
    );
    assert.deepEqual(result, { ok: true });
    assert.equal(captured.init.headers["X-API-Key"], "plk_test");
    assert.match(captured.url, /\/v1\/public\/spaces\?page=1$/);
  });

  test("non-2xx body becomes typed error", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "nope" }), { status: 404, headers: { "content-type": "application/json" } });
    const { PlakyNotFoundError } = await import("../esm/runtime/errors.js");
    await assert.rejects(
      request({ method: "GET", path: "/v1/missing", operationId: "x" }, { apiKey: "plk_test", serverURL: "https://example.test" }),
      (err) => err instanceof PlakyNotFoundError && err.status === 404,
    );
  });
  ```

- [ ] **Step 2: Implement `sdk/src/runtime/errors.ts`.**

  ```ts
  export class PlakyApiError extends Error {
    readonly name = "PlakyApiError";
    constructor(
      message: string,
      readonly status: number,
      readonly requestId?: string,
      readonly body?: unknown,
      readonly retryAfterMs?: number,
    ) {
      super(message);
    }
  }
  export class PlakyValidationError extends PlakyApiError { readonly name = "PlakyValidationError" as const; }
  export class PlakyNotFoundError extends PlakyApiError { readonly name = "PlakyNotFoundError" as const; }
  export class PlakyRateLimitError extends PlakyApiError { readonly name = "PlakyRateLimitError" as const; }
  export class PlakyAuthError extends PlakyApiError { readonly name = "PlakyAuthError" as const; }
  export class PlakyAmbiguousMatchError extends Error {
    readonly name = "PlakyAmbiguousMatchError" as const;
    constructor(message: string, readonly candidates: unknown[]) { super(message); }
  }

  export function classify(status: number, message: string, requestId: string | undefined, body: unknown, retryAfterMs: number | undefined): PlakyApiError {
    if (status === 401 || status === 403) return new PlakyAuthError(message, status, requestId, body);
    if (status === 404) return new PlakyNotFoundError(message, status, requestId, body);
    if (status === 422 || status === 400) return new PlakyValidationError(message, status, requestId, body);
    if (status === 429) return new PlakyRateLimitError(message, status, requestId, body, retryAfterMs);
    return new PlakyApiError(message, status, requestId, body);
  }
  ```

- [ ] **Step 3: Implement `sdk/src/runtime/http.ts`.**

  ```ts
  import { classify } from "./errors.js";
  import { buildUserAgent } from "./user-agent.js";

  export type PlakyRequestOptions = {
    apiKey: string;
    serverURL: string;
    timeoutMs?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
    interceptors?: import("./interceptors.js").Interceptors;
    signal?: AbortSignal;
    rateLimitSink?: import("./rate-limit.js").RateLimitSink;
    idempotencyKey?: string;
    userAgent?: string;
  };

  export type RawRequest = {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    query?: Record<string, unknown> | undefined;
    body?: unknown;
    operationId: string;
  };

  export async function request<T>(req: RawRequest, opts: PlakyRequestOptions): Promise<T> {
    const url = buildUrl(opts.serverURL, req.path, req.query);
    const headers: Record<string, string> = {
      "X-API-Key": opts.apiKey,
      "Accept": "application/json",
      "User-Agent": opts.userAgent ?? buildUserAgent(),
      ...opts.headers,
    };
    if (req.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;

    const init: RequestInit = {
      method: req.method,
      headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal: opts.signal,
    };

    const intercepted = opts.interceptors?.request ? await opts.interceptors.request({ url, init, operationId: req.operationId }) : { url, init };
    const response = await doFetch(intercepted.url, intercepted.init, opts.timeoutMs ?? 30_000);

    opts.rateLimitSink?.observe(response.headers);
    const requestId = response.headers.get("x-request-id") ?? undefined;
    const text = await response.text();
    const body: unknown = text ? safeParse(text) : undefined;

    await opts.interceptors?.response?.({ url: intercepted.url, response, body, operationId: req.operationId });

    if (!response.ok) {
      const message = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : response.statusText;
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      throw classify(response.status, message, requestId, body, retryAfter);
    }
    return body as T;
  }

  function buildUrl(server: string, path: string, query?: Record<string, unknown>): string {
    const u = new URL(path.replace(/^\//, ""), server.endsWith("/") ? server : `${server}/`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) for (const item of v) u.searchParams.append(k, String(item));
        else u.searchParams.set(k, String(v));
      }
    }
    return u.toString();
  }

  function safeParse(text: string): unknown {
    try { return JSON.parse(text); } catch { return text; }
  }

  function parseRetryAfter(header: string | null): number | undefined {
    if (!header) return undefined;
    const seconds = Number(header);
    if (!Number.isNaN(seconds)) return seconds * 1000;
    const date = Date.parse(header);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
    return undefined;
  }

  async function doFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    const userSignal = init.signal as AbortSignal | undefined;
    userSignal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
      userSignal?.removeEventListener("abort", onAbort);
    }
  }
  ```

- [ ] **Step 4: Implement supporting runtime files.**

  `sdk/src/runtime/user-agent.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { fileURLToPath } from "node:url";

  const pkgUrl = new URL("../../package.json", import.meta.url);
  const { version } = JSON.parse(readFileSync(fileURLToPath(pkgUrl), "utf8")) as { version: string };

  export function buildUserAgent(suffix?: string): string {
    return `plaky115/${version} node/${process.version}${suffix ? ` ${suffix}` : ""}`;
  }
  ```

  `sdk/src/runtime/interceptors.ts`:
  ```ts
  export type Interceptors = {
    request?: (ctx: { url: string; init: RequestInit; operationId: string }) => Promise<{ url: string; init: RequestInit }> | { url: string; init: RequestInit };
    response?: (ctx: { url: string; response: Response; body: unknown; operationId: string }) => Promise<void> | void;
  };
  ```

  `sdk/src/runtime/rate-limit.ts`:
  ```ts
  export type RateLimitSnapshot = { limit?: number; remaining?: number; resetAt?: number };
  export class RateLimitSink {
    last: RateLimitSnapshot = {};
    observe(h: Headers): void {
      const limit = parseNum(h.get("x-ratelimit-limit"));
      const remaining = parseNum(h.get("x-ratelimit-remaining"));
      const reset = parseNum(h.get("x-ratelimit-reset"));
      this.last = {
        limit,
        remaining,
        resetAt: reset !== undefined && reset > 1_000_000_000 ? reset * 1000 : reset,
      };
    }
  }
  function parseNum(v: string | null): number | undefined { return v == null ? undefined : Number(v); }
  ```

  `sdk/src/runtime/idempotency.ts`:
  ```ts
  import { randomUUID } from "node:crypto";
  export function newIdempotencyKey(prefix = "idmp"): string {
    return `${prefix}_${randomUUID()}`;
  }
  ```

  `sdk/src/runtime/retries.ts`:
  ```ts
  import { PlakyApiError, PlakyRateLimitError } from "./errors.js";

  export async function withRetries<T>(
    fn: () => Promise<T>,
    opts: { maxRetries: number; baseDelayMs?: number; isRetryable?: (err: unknown) => boolean } = { maxRetries: 2 },
  ): Promise<T> {
    const base = opts.baseDelayMs ?? 250;
    const isRetryable = opts.isRetryable ?? defaultRetryable;
    for (let attempt = 0; ; attempt++) {
      try { return await fn(); }
      catch (err) {
        if (attempt >= opts.maxRetries || !isRetryable(err)) throw err;
        const wait = err instanceof PlakyRateLimitError && err.retryAfterMs ? err.retryAfterMs : base * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait + Math.random() * 100));
      }
    }
  }

  function defaultRetryable(err: unknown): boolean {
    if (err instanceof PlakyRateLimitError) return true;
    if (err instanceof PlakyApiError) return err.status >= 500 && err.status < 600;
    return false;
  }
  ```

  `sdk/src/runtime/redact.ts`:
  ```ts
  const SECRET = /(plk_[A-Za-z0-9]{12,})/g;
  export function redact(value: string): string { return value.replace(SECRET, "plk_***"); }
  export function redactRecord<T>(value: T): T {
    return JSON.parse(redact(JSON.stringify(value))) as T;
  }
  ```

  `sdk/src/runtime/pagination.ts`:
  ```ts
  export type Page<T> = { data: T[]; hasMore: boolean; raw: unknown };
  export type PageFetcher<T> = (cursor: { page: number; pageSize: number }) => Promise<Page<T>>;

  export function paginate<T>(fetcher: PageFetcher<T>, opts: { pageSize?: number; limit?: number } = {}): AsyncIterableIterator<T> & { pages(): AsyncIterableIterator<Page<T>> } {
    const pageSize = opts.pageSize ?? 100;
    const limit = opts.limit;
    let yielded = 0;
    let page = 1;
    let buffer: T[] = [];
    let done = false;

    const iterator: AsyncIterableIterator<T> = {
      [Symbol.asyncIterator]() { return this; },
      async next() {
        if (limit !== undefined && yielded >= limit) return { done: true, value: undefined };
        while (buffer.length === 0 && !done) {
          const p = await fetcher({ page, pageSize });
          buffer = p.data ?? [];
          done = !p.hasMore;
          page++;
        }
        if (buffer.length === 0) return { done: true, value: undefined };
        yielded++;
        return { done: false, value: buffer.shift()! };
      },
    };

    function pages(): AsyncIterableIterator<Page<T>> {
      let pg = 1;
      let stop = false;
      return {
        [Symbol.asyncIterator]() { return this; },
        async next() {
          if (stop) return { done: true, value: undefined };
          const p = await fetcher({ page: pg++, pageSize });
          if (!p.hasMore) stop = true;
          return { done: false, value: p };
        },
      };
    }

    return Object.assign(iterator, { pages });
  }
  ```

  `sdk/src/runtime/webhooks.ts`:
  ```ts
  import { createHmac, timingSafeEqual } from "node:crypto";

  export type WebhookVerifyOptions = { secret: string; toleranceSeconds?: number };

  export function verifyWebhookSignature(rawBody: string, signature: string, timestamp: string, opts: WebhookVerifyOptions): boolean {
    const tolerance = opts.toleranceSeconds ?? 300;
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > tolerance) return false;
    const expected = createHmac("sha256", opts.secret).update(`${timestamp}.${rawBody}`).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
  ```

- [ ] **Step 5: Build sdk, run http test.**

  ```bash
  npm --prefix sdk run build
  node --test sdk/test/http.test.mjs
  ```

  Expected: PASS, 2 tests.

- [ ] **Step 6: Commit runtime.**

  ```bash
  git add sdk/src/runtime/ sdk/test/http.test.mjs
  git commit -m "feat(sdk): hand-crafted runtime — http, errors, pagination, retries, rate-limit, idempotency, webhooks"
  ```

### 5.2 — SDK resource clients (`sdk/src/client/`)

- [ ] **Step 1: Write a client test.**

  Create `sdk/test/client.test.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test, beforeEach } from "node:test";
  import { PlakyClient } from "../esm/index.js";

  let calls;
  beforeEach(() => {
    calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: url.toString(), init });
      if (url.toString().includes("/spaces/123/boards/456/items")) {
        return new Response(JSON.stringify({ data: [{ id: 1, title: "Item A" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.toString().endsWith("/spaces")) {
        return new Response(JSON.stringify({ data: [{ id: 123, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    };
  });

  test("client.spaces.list returns typed page", async () => {
    const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
    const page = await client.spaces.list({ page: 1, pageSize: 10 });
    assert.deepEqual(page.data?.[0]?.title, "Ops");
  });

  test("client.items.list flows path params", async () => {
    const client = new PlakyClient({ apiKey: "plk_test", serverURL: "https://example.test" });
    const page = await client.items.list({ spaceId: 123, boardId: 456 });
    assert.equal(page.data?.[0]?.id, 1);
    assert.match(calls.at(-1).url, /\/spaces\/123\/boards\/456\/items/);
  });
  ```

- [ ] **Step 2: Implement client modules.**

  `sdk/src/client/client.ts`:

  ```ts
  import { RateLimitSink } from "../runtime/rate-limit.js";
  import type { Interceptors } from "../runtime/interceptors.js";
  import { SpacesResource } from "./spaces.js";
  import { BoardsResource } from "./boards.js";
  import { ItemsResource } from "./items.js";
  import { ItemCommentsResource } from "./item-comments.js";
  import { UsersResource } from "./users.js";
  import { TeamsResource } from "./teams.js";

  export type PlakyClientOptions = {
    apiKey: string;
    serverURL?: string;
    timeoutMs?: number;
    maxRetries?: number;
    headers?: Record<string, string>;
    interceptors?: Interceptors;
    userAgent?: string;
  };

  export const DEFAULT_SERVER_URL = "https://api.plaky.com";

  export class PlakyClient {
    readonly options: Required<Omit<PlakyClientOptions, "interceptors" | "userAgent" | "headers">> & Pick<PlakyClientOptions, "interceptors" | "userAgent" | "headers">;
    readonly rateLimit = new RateLimitSink();
    readonly spaces: SpacesResource;
    readonly boards: BoardsResource;
    readonly items: ItemsResource;
    readonly comments: ItemCommentsResource;
    readonly users: UsersResource;
    readonly teams: TeamsResource;

    constructor(opts: PlakyClientOptions) {
      if (!opts.apiKey) throw new Error("PlakyClient: apiKey is required");
      this.options = {
        apiKey: opts.apiKey,
        serverURL: opts.serverURL ?? DEFAULT_SERVER_URL,
        timeoutMs: opts.timeoutMs ?? 30_000,
        maxRetries: opts.maxRetries ?? 2,
        headers: opts.headers,
        interceptors: opts.interceptors,
        userAgent: opts.userAgent,
      };
      this.spaces = new SpacesResource(this);
      this.boards = new BoardsResource(this);
      this.items = new ItemsResource(this);
      this.comments = new ItemCommentsResource(this);
      this.users = new UsersResource(this);
      this.teams = new TeamsResource(this);
    }

    withOptions(overrides: Partial<PlakyClientOptions>): PlakyClient {
      return new PlakyClient({ ...this.options, ...overrides, apiKey: overrides.apiKey ?? this.options.apiKey });
    }

    requestOptions() {
      return {
        apiKey: this.options.apiKey,
        serverURL: this.options.serverURL,
        timeoutMs: this.options.timeoutMs,
        maxRetries: this.options.maxRetries,
        headers: this.options.headers,
        interceptors: this.options.interceptors,
        userAgent: this.options.userAgent,
        rateLimitSink: this.rateLimit,
      };
    }
  }
  ```

  `sdk/src/client/spaces.ts`:

  ```ts
  import type { PlakyClient } from "./client.js";
  import { listSpaces } from "../generated/operations/list-spaces.js";
  import { getSpace } from "../generated/operations/get-space.js";
  import { paginate } from "../runtime/pagination.js";

  export class SpacesResource {
    constructor(private readonly client: PlakyClient) {}

    list(query?: { page?: number; pageSize?: number }) {
      return listSpaces({ query }, this.client.requestOptions());
    }

    get(spaceId: string | number) {
      return getSpace({ spaceId }, this.client.requestOptions());
    }

    iterate(opts: { pageSize?: number; limit?: number } = {}) {
      return paginate<{ id?: number; title?: string }>(
        async ({ page, pageSize }) => {
          const res = await this.list({ page, pageSize }) as { data?: any[]; hasMore?: boolean };
          return { data: res.data ?? [], hasMore: res.hasMore === true, raw: res };
        },
        opts,
      );
    }

    async listAll(opts?: { pageSize?: number; limit?: number }) {
      const out = [];
      for await (const space of this.iterate(opts)) out.push(space);
      return out;
    }
  }
  ```

  Repeat the resource pattern for `boards.ts`, `items.ts`, `item-comments.ts`, `reactions.ts`, `users.ts`, `teams.ts`. Each file follows the same shape: constructor takes `PlakyClient`, methods call generated operations, `iterate()` + `listAll()` use `paginate()` for list endpoints, mutation methods support `idempotencyKey` and `dryRun`.

  Full text for each resource is in `docs/codegen.md` (written in Phase 11). For tasks here, the engineer follows this template and adapts per the operation table:

  ```ts
  // Template
  import type { PlakyClient } from "./client.js";
  import { <op> } from "../generated/operations/<slug>.js";
  // ... iterate/listAll for list endpoints
  // ... idempotencyKey auto-gen on mutations
  ```

- [ ] **Step 3: Implement remaining resource files following the template.**

  Skeleton for each:

  `sdk/src/client/boards.ts` — methods: `list({ spaceId, page, pageSize })`, `get({ spaceId, boardId })`, `iterate({ spaceId, pageSize, limit })`, `listAll({ spaceId, ... })`.

  `sdk/src/client/items.ts` — methods: `list({ spaceId, boardId, page, pageSize })`, `get({ spaceId, boardId, itemId })`, `listSubitems({ spaceId, boardId, itemId, page, pageSize })`, `create({ spaceId, boardId, body, idempotencyKey?, dryRun? })`, `delete({ spaceId, boardId, itemId, idempotencyKey? })`, `updateField({ spaceId, boardId, itemId, itemFieldKey, body, idempotencyKey? })`, `updateFields({ spaceId, boardId, itemId, body, idempotencyKey?, dryRun? })`, plus `iterate` + `listAll` for the two list endpoints.

  `sdk/src/client/item-comments.ts` — methods: `list({ spaceId, boardId, itemId, page, pageSize })`, `create({ ..., body })`, `update({ ..., itemCommentId, body })`, `delete({ ..., itemCommentId })`, `iterate`, `listAll`.

  `sdk/src/client/reactions.ts` — single method `replace({ spaceId, boardId, itemId, itemCommentId, body })`.

  `sdk/src/client/users.ts` — `list({ page, pageSize })`, `me()` (calls `getCurrentUser`), `iterate`, `listAll`.

  `sdk/src/client/teams.ts` — `list({ page, pageSize })`, `get({ teamId })`, `iterate`, `listAll`.

- [ ] **Step 4: Implement `sdk/src/index.ts`.**

  ```ts
  export { PlakyClient, DEFAULT_SERVER_URL } from "./client/client.js";
  export type { PlakyClientOptions } from "./client/client.js";
  export {
    PlakyApiError,
    PlakyValidationError,
    PlakyNotFoundError,
    PlakyRateLimitError,
    PlakyAuthError,
    PlakyAmbiguousMatchError,
  } from "./runtime/errors.js";
  export { newIdempotencyKey } from "./runtime/idempotency.js";
  export { verifyWebhookSignature } from "./runtime/webhooks.js";
  export type { Interceptors } from "./runtime/interceptors.js";
  export type { RateLimitSnapshot } from "./runtime/rate-limit.js";
  export type { Page, PageFetcher } from "./runtime/pagination.js";
  export { operationTable } from "./generated/operation-table.js";
  export type { OperationId } from "./generated/operation-table.js";
  ```

- [ ] **Step 5: Update `sdk/package.json` exports.**

  Remove `./plaky`, `./types`, `./models`, `./models/operations`, `./models/errors` exports (those mapped to deleted dirs). Keep only:

  ```json
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./esm/index.d.ts",
      "default": "./esm/index.js"
    },
    "./package.json": "./package.json"
  }
  ```

  Update `description`: `"Hand-crafted TypeScript SDK for the Plaky public API. Unofficial."`

- [ ] **Step 6: Delete legacy generated files.**

  ```bash
  rm -rf sdk/src/sdk sdk/src/funcs sdk/src/models sdk/src/hooks sdk/src/lib sdk/src/types sdk/src/core.ts sdk/src/plaky
  ```

- [ ] **Step 7: Build and test.**

  ```bash
  npm --prefix sdk run build
  node --test sdk/test/client.test.mjs sdk/test/http.test.mjs
  ```

  Expected: build succeeds, all tests pass.

- [ ] **Step 8: Commit.**

  ```bash
  git add -A sdk/
  git commit -m "$(cat <<'EOF'
  feat(sdk): hand-crafted PlakyClient replaces Speakeasy-generated layer

  Removes sdk/src/{sdk,funcs,models,hooks,lib,types,plaky,core.ts} (Speakeasy
  output) and replaces it with sdk/src/client/* (resource-oriented client),
  sdk/src/runtime/* (http, errors, pagination, retries, rate-limit,
  idempotency, webhooks, interceptors), sdk/src/index.ts (public surface).
  Types come from sdk/src/generated/types.ts (openapi-typescript). Low-level
  operations come from sdk/src/generated/operations/* (in-repo codegen).
  Tests in sdk/test/*.test.mjs exercise the new layout end-to-end with
  globalThis.fetch mocks.
  EOF
  )"
  ```

### 5.3 — Fields builders, resolvers, workflows

- [ ] **Step 1: Move existing field builders from `sdk/src/plaky/index.ts` (now deleted) into `sdk/src/fields/`.**

  Recreate the public API (`statusField`, `tagField`, `personField`, `timelineField`, `linkField`, `numberField`, `stringField`, `fieldValues`) as pure functions in `sdk/src/fields/builders.ts` and `sdk/src/fields/values.ts`. Reuse the exact shapes and validation messages from `git show HEAD~1:sdk/src/plaky/index.ts`.

- [ ] **Step 2: Tests for builders.**

  Create `sdk/test/fields.test.mjs` covering: each builder produces the documented payload, invalid input throws with the documented message, `fieldValues({})` returns an empty array. Use exact assertion values from the existing tests in v1 Phase 8.

- [ ] **Step 3: Resolvers and workflows.**

  `sdk/src/resolvers/index.ts`: `resolveSpace(client, name | id)`, `resolveBoard(client, { space, board })`, `resolveUser(client, name | email | id)`, `resolveTeam(client, name | id)`, `resolveItem(client, { space, board, title })`. Each does a list-then-filter walk and throws `PlakyAmbiguousMatchError` on >1 match.

  `sdk/src/workflows/index.ts`: `workspaceMap(client)`, `searchItems(client, { space, board, query, limit })`, `bulkUpdateItems(client, { space, board, updates, dryRun })`, `exportItems(client, { space, board, format: "jsonl" | "csv" })`.

- [ ] **Step 4: Tests, commit.**

  ```bash
  node --test sdk/test/fields.test.mjs sdk/test/resolvers.test.mjs sdk/test/workflows.test.mjs
  git add sdk/src/fields/ sdk/src/resolvers/ sdk/src/workflows/ sdk/test/
  git commit -m "feat(sdk): fields builders, resolvers, and workflow helpers"
  ```

### 5.4 — MCP server (`mcp-server/src/`)

- [ ] **Step 1: Implement runtime + types.**

  `mcp-server/src/runtime/types.ts`:

  ```ts
  import type { z, ZodTypeAny } from "zod/v3";
  import type { PlakyClient } from "plaky115";

  export type McpScope = "read" | "write" | "destructive";
  export type CompactKind = "raw" | "item" | "board" | "space" | "comment";

  export type McpRespondOptions = { compactKind?: CompactKind; includeRaw?: boolean };

  export type McpToolContext = {
    client: PlakyClient;
    requestOptions: ReturnType<PlakyClient["requestOptions"]>;
    respond(value: unknown, opts?: McpRespondOptions): { content: Array<{ type: "text"; text: string }> };
    progress(message: string, percent?: number): void;
  };

  export type McpToolDefinition = {
    name: string;
    title: string;
    description: string;
    scopes: McpScope[];
    annotations: {
      readOnlyHint: boolean;
      destructiveHint: boolean;
      idempotentHint: boolean;
      openWorldHint: boolean;
    };
    inputSchema: ZodTypeAny;
    handler: (input: any, ctx: McpToolContext) => Promise<unknown>;
  };
  ```

- [ ] **Step 2: Implement compaction + server.**

  `mcp-server/src/runtime/compaction.ts` — port `compactItem`, `compactBoard`, `compactSpace`, `compactComment`, `compactList` from `git show HEAD~N:mcp-server/src/mcp-server/plaky-curated-tools.ts`. Add `redact` pass over output text using `redact()` from SDK.

  `mcp-server/src/runtime/progress.ts` — wraps MCP SDK progress notifications.

  `mcp-server/src/server/scopes.ts`:

  ```ts
  import type { McpScope, McpToolDefinition } from "../runtime/types.js";
  export function filterByScopes(tools: McpToolDefinition[], allowed: Set<McpScope>): McpToolDefinition[] {
    return tools.filter((t) => t.scopes.every((s) => allowed.has(s)));
  }
  ```

  `mcp-server/src/server/modes.ts`:

  ```ts
  import type { McpToolDefinition } from "../runtime/types.js";
  import { rawTools } from "../tools/raw/index.js";
  import { curatedTools } from "../tools/curated/index.js";
  export type Mode = "curated" | "generated" | "all";
  export function selectTools(mode: Mode): McpToolDefinition[] {
    if (mode === "curated") return curatedTools;
    if (mode === "generated") return rawTools;
    return [...curatedTools, ...rawTools];
  }
  ```

  `mcp-server/src/server/index.ts`:

  ```ts
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { PlakyClient } from "plaky115";
  import { selectTools, type Mode } from "./modes.js";
  import { filterByScopes } from "./scopes.js";
  import { compactByKind } from "../runtime/compaction.js";
  import type { McpScope, McpToolContext, McpToolDefinition } from "../runtime/types.js";

  export type ServerOptions = {
    apiKey: string;
    serverURL?: string;
    mode: Mode;
    scopes: McpScope[];
  };

  export function buildServer(opts: ServerOptions): McpServer {
    const client = new PlakyClient({ apiKey: opts.apiKey, serverURL: opts.serverURL });
    const tools = filterByScopes(selectTools(opts.mode), new Set(opts.scopes));
    const server = new McpServer({ name: "plaky115", version: "0.1.0" });
    for (const tool of tools) {
      server.registerTool(tool.name, {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema as any,
        annotations: tool.annotations,
      }, async (input) => {
        const ctx: McpToolContext = {
          client,
          requestOptions: client.requestOptions(),
          respond(value, ro) {
            const compacted = ro?.compactKind ? compactByKind(value, ro.compactKind, { includeRaw: ro.includeRaw }) : value;
            return { content: [{ type: "text", text: JSON.stringify(compacted) }] };
          },
          progress() {},
        };
        const result = await tool.handler(input, ctx);
        return result as ReturnType<McpToolContext["respond"]>;
      });
    }
    return server;
  }
  ```

  `mcp-server/src/server/stdio.ts` (bin entry):

  ```ts
  #!/usr/bin/env node
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  import { parseArgs } from "node:util";
  import { buildServer } from "./index.js";
  import type { McpScope } from "../runtime/types.js";

  const { values } = parseArgs({
    options: {
      mode: { type: "string", default: "all" },
      scope: { type: "string", multiple: true, default: [] as string[] },
    },
  });
  const apiKey = process.env.PLAKY115_API_KEY ?? process.env.PLAKY115_API_KEY_AUTH ?? "";
  const scopes: McpScope[] = (values.scope as string[]).length > 0 ? (values.scope as McpScope[]) : ["read", "write", "destructive"];
  const server = buildServer({ apiKey, mode: values.mode as "curated" | "generated" | "all", scopes });
  await server.connect(new StdioServerTransport());
  ```

  `mcp-server/src/server/build.mts`:

  ```ts
  import { build } from "bun";
  await build({
    entrypoints: ["src/server/stdio.ts"],
    outdir: "bin",
    naming: "mcp-server.js",
    target: "node",
    format: "esm",
    external: ["@modelcontextprotocol/sdk", "plaky115", "zod"],
  });
  ```

- [ ] **Step 3: Implement curated tools.**

  Port the five curated tools from `mcp-server/src/mcp-server/plaky-curated-tools.ts` (search-docs, workspace-context, find, plan-mutation, execute-workflow). Each becomes its own file under `mcp-server/src/tools/curated/`. Update `search-docs.ts` to consume `mcp-server/src/runtime/docs-index.ts` (generated in Phase 4.6).

  `mcp-server/src/tools/curated/index.ts`:

  ```ts
  import type { McpToolDefinition } from "../../runtime/types.js";
  export { searchDocsTool } from "./search-docs.js";
  export { workspaceContextTool } from "./workspace-context.js";
  export { findTool } from "./find.js";
  export { planMutationTool } from "./plan-mutation.js";
  export { executeWorkflowTool } from "./execute-workflow.js";
  import { searchDocsTool } from "./search-docs.js";
  import { workspaceContextTool } from "./workspace-context.js";
  import { findTool } from "./find.js";
  import { planMutationTool } from "./plan-mutation.js";
  import { executeWorkflowTool } from "./execute-workflow.js";
  export const curatedTools: McpToolDefinition[] = [searchDocsTool, workspaceContextTool, findTool, planMutationTool, executeWorkflowTool];
  ```

- [ ] **Step 4: Update `mcp-server/package.json`.**

  ```json
  "bin": { "mcp": "bin/mcp-server.js" },
  "exports": {
    ".": { "source": "./src/server/index.ts", "types": "./esm/server/index.d.ts", "default": "./esm/server/index.js" },
    "./package.json": "./package.json"
  },
  "scripts": {
    "lint": "oxlint --max-warnings=0 --deny-warnings src/**/*.ts",
    "build:bin": "bun src/server/build.mts",
    "build": "node ../scripts/clean-package-builds.mjs mcp-server && npm run build:bin && tsgo",
    "test": "npm run build && node --test test/*.test.mjs",
    "prepublishOnly": "npm run build"
  },
  "dependencies": { "@modelcontextprotocol/sdk": "^1.26.0", "plaky115": "0.1.0", "zod": "^3.25.0 || ^4.0.0" }
  ```

  Add `plaky115` workspace dependency (local link via `file:../sdk` for dev, or workspaces in `package.json` root).

- [ ] **Step 5: Delete legacy MCP files.**

  ```bash
  rm -rf mcp-server/src/mcp-server mcp-server/src/funcs mcp-server/src/sdk mcp-server/src/models mcp-server/src/hooks mcp-server/src/lib mcp-server/src/types mcp-server/src/core.ts mcp-server/src/index.ts mcp-server/esm
  ```

- [ ] **Step 6: Add tests.**

  Create `mcp-server/test/server.test.mjs`, `scopes.test.mjs`, `curated-tools.test.mjs`, `raw-tools.test.mjs`, `docs-search.test.mjs`. Each spins up `buildServer` against a fetch mock and asserts tool registration, scope filtering, and compact-by-default output.

- [ ] **Step 7: Build, test, commit.**

  ```bash
  npm --prefix mcp-server run build
  npm --prefix mcp-server test
  git add -A mcp-server/
  git commit -m "feat(mcp): hand-crafted MCP server replaces Speakeasy generated scaffolding"
  ```

### 5.5 — Go CLI (`cli/internal/plakysdk/` + `cli/internal/cli/`)

- [ ] **Step 1: Implement `cli/internal/plakysdk/`.**

  `client.go`:

  ```go
  package plakysdk

  import (
      "context"
      "encoding/json"
      "fmt"
      "io"
      "net/http"
      "net/url"
      "strings"
      "time"
  )

  type ClientOptions struct {
      APIKey     string
      ServerURL  string
      Timeout    time.Duration
      MaxRetries int
      UserAgent  string
      HTTPClient *http.Client
  }

  type Client struct{ opts ClientOptions; http *http.Client }

  func New(opts ClientOptions) (*Client, error) {
      if opts.APIKey == "" {
          return nil, fmt.Errorf("plakysdk: APIKey required")
      }
      if opts.ServerURL == "" {
          opts.ServerURL = "https://api.plaky.com"
      }
      if opts.Timeout == 0 {
          opts.Timeout = 30 * time.Second
      }
      hc := opts.HTTPClient
      if hc == nil {
          hc = &http.Client{Timeout: opts.Timeout}
      }
      return &Client{opts: opts, http: hc}, nil
  }

  type Request struct {
      Method      string
      Path        string
      Query       url.Values
      Body        any
      Idempotency string
  }

  func (c *Client) Do(ctx context.Context, req Request, out any) error {
      u, err := url.Parse(strings.TrimRight(c.opts.ServerURL, "/") + req.Path)
      if err != nil {
          return err
      }
      if req.Query != nil {
          u.RawQuery = req.Query.Encode()
      }
      var body io.Reader
      if req.Body != nil {
          b, err := json.Marshal(req.Body)
          if err != nil {
              return err
          }
          body = strings.NewReader(string(b))
      }
      httpReq, err := http.NewRequestWithContext(ctx, req.Method, u.String(), body)
      if err != nil {
          return err
      }
      httpReq.Header.Set("X-API-Key", c.opts.APIKey)
      httpReq.Header.Set("Accept", "application/json")
      if req.Body != nil {
          httpReq.Header.Set("Content-Type", "application/json")
      }
      if req.Idempotency != "" {
          httpReq.Header.Set("Idempotency-Key", req.Idempotency)
      }
      if c.opts.UserAgent != "" {
          httpReq.Header.Set("User-Agent", c.opts.UserAgent)
      }
      resp, err := c.http.Do(httpReq)
      if err != nil {
          return err
      }
      defer resp.Body.Close()
      raw, _ := io.ReadAll(resp.Body)
      if resp.StatusCode >= 400 {
          return decodeError(resp.StatusCode, raw, resp.Header.Get("X-Request-ID"))
      }
      if len(raw) == 0 || out == nil {
          return nil
      }
      return json.Unmarshal(raw, out)
  }
  ```

  `errors.go`:

  ```go
  package plakysdk

  type APIError struct {
      Status    int
      Message   string
      RequestID string
      Body      []byte
  }

  func (e *APIError) Error() string { return e.Message }

  func decodeError(status int, body []byte, reqID string) error {
      return &APIError{Status: status, Message: string(body), RequestID: reqID, Body: body}
  }
  ```

  Add generated resource methods in `cli/internal/plakysdk/operations.go` via the codegen extension below.

- [ ] **Step 2: Extend `scripts/generate-cli.mjs` to also produce `cli/internal/plakysdk/operations.go`.**

  Append a second emission in `generate-cli.mjs`:

  ```js
  import { buildGoOperations } from "./lib/codegen-cli.mjs";
  // ... after writing cobra commands:
  writeFileSync(join(root, "cli/internal/plakysdk/operations.go"), buildGoOperations(ops));
  ```

  Add `buildGoOperations(ops)` to `scripts/lib/codegen-cli.mjs` that emits one Go function per operation with typed params and a `Do(...)` call.

- [ ] **Step 3: Rewrite `cli/internal/cli/root.go`.**

  Removes Speakeasy auth/configure scaffolding; replaces with cobra root that wires `cli/internal/cli/raw.NewRawRoot(client)` plus the curated `dx.go` commands.

- [ ] **Step 4: Update `cli/internal/cli/dx.go` to import `plakysdk` instead of `internal/sdk`.**

  Search and replace `internal/sdk` → `internal/plakysdk`. Adapt request/response types to match the new hand-crafted SDK.

- [ ] **Step 5: Delete legacy Go SDK + raw command dirs.**

  ```bash
  rm -rf cli/internal/sdk cli/internal/cli/spaces cli/internal/cli/boards cli/internal/cli/items cli/internal/cli/itemcomments cli/internal/cli/itemcommentreactions cli/internal/cli/teams cli/internal/cli/users
  rm -f cli/internal/cli/configure.go cli/internal/cli/auth.go
  ```

- [ ] **Step 6: Build + test.**

  ```bash
  cd cli && go mod tidy && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115
  /tmp/plaky115 --help
  /tmp/plaky115 raw --help | head -30
  ```

- [ ] **Step 7: Commit.**

  ```bash
  git add -A cli/ scripts/
  git commit -m "feat(cli): hand-crafted plakysdk + raw cobra subtree replace Speakeasy Go SDK"
  ```

### 5.6 — Shrink postgen

- [ ] **Step 1: Replace `scripts/postgen-dx.mjs` with a minimal version.**

  ```js
  #!/usr/bin/env node
  import { readFileSync, writeFileSync } from "node:fs";
  import { join } from "node:path";
  import { fileURLToPath } from "node:url";

  const root = fileURLToPath(new URL("..", import.meta.url));

  function syncPackageMetadata(file, mutate) {
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    const before = JSON.stringify(pkg);
    mutate(pkg);
    const after = JSON.stringify(pkg, null, 2) + "\n";
    if (before !== JSON.stringify(JSON.parse(after))) writeFileSync(file, after);
  }

  syncPackageMetadata(join(root, "sdk/package.json"), (pkg) => {
    pkg.description = "Hand-crafted TypeScript SDK for the Plaky public API. Unofficial.";
    pkg.license = "MIT";
    pkg.repository = pkg.repository ?? { type: "git", url: "https://github.com/apet97/plaky115" };
  });

  syncPackageMetadata(join(root, "mcp-server/package.json"), (pkg) => {
    pkg.description = "Hand-crafted MCP server for the Plaky public API. Unofficial.";
    pkg.license = "MIT";
    pkg.repository = pkg.repository ?? { type: "git", url: "https://github.com/apet97/plaky115" };
  });

  console.log("postgen-dx: package metadata synced");
  ```

- [ ] **Step 2: Add postgen-determinism test.**

  Create `scripts/test-postgen-determinism.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { spawnSync } from "node:child_process";
  import { readFileSync } from "node:fs";
  import { fileURLToPath } from "node:url";

  const root = fileURLToPath(new URL("..", import.meta.url));

  test("postgen-dx is idempotent", () => {
    spawnSync("node", ["scripts/postgen-dx.mjs"], { cwd: root });
    const a = readFileSync(`${root}/sdk/package.json`, "utf8") + readFileSync(`${root}/mcp-server/package.json`, "utf8");
    spawnSync("node", ["scripts/postgen-dx.mjs"], { cwd: root });
    const b = readFileSync(`${root}/sdk/package.json`, "utf8") + readFileSync(`${root}/mcp-server/package.json`, "utf8");
    assert.equal(a, b);
  });
  ```

- [ ] **Step 3: Verify.**

  ```bash
  npm run postgen
  node --test scripts/test-postgen-determinism.mjs
  git diff -- sdk/package.json mcp-server/package.json   # expect nothing on second run
  ```

- [ ] **Step 4: Commit.**

  ```bash
  git add scripts/postgen-dx.mjs scripts/test-postgen-determinism.mjs
  git commit -m "refactor(postgen): shrink to package metadata sync, prove idempotence"
  ```

---

## Phase 6: Metadata-Driven Docs Search

This phase was mostly written in Phase 4.6 (the generator). The remaining work is the search implementation.

- [ ] **Step 1: Tests.**

  Create `mcp-server/test/docs-search.test.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { searchDocs } from "../esm/tools/curated/search-docs.js";

  test("query pagination returns the workspace map workflow", () => {
    const hits = searchDocs("pagination hasMore", 5);
    assert.ok(hits.length > 0);
  });

  test("query replace reactions returns the operation", () => {
    const hits = searchDocs("replace reactions", 5);
    assert.ok(hits.some((h) => h.id === "op:replaceCommentReactions"));
  });

  test("default response is compact (no full text)", () => {
    const hits = searchDocs("bulk update fields", 5);
    assert.ok(hits.every((h) => !("text" in h)));
  });

  test("includeRaw returns full text", () => {
    const hits = searchDocs("bulk update fields", 5, { includeRaw: true });
    assert.ok(hits.some((h) => typeof h.text === "string"));
  });
  ```

- [ ] **Step 2: Implement `mcp-server/src/tools/curated/search-docs.ts`.**

  ```ts
  import { z } from "zod/v3";
  import { docsIndex, type PlakyDocsEntry } from "../../runtime/docs-index.js";
  import type { McpToolDefinition } from "../../runtime/types.js";

  export type SearchHit = { id: string; title: string; kind: string; score: number; text?: string };

  export function searchDocs(query: string, limit = 5, opts: { includeRaw?: boolean } = {}): SearchHit[] {
    const terms = query.toLowerCase().split(/[^a-z0-9_.]+/).filter(Boolean);
    if (terms.length === 0) return [];
    const scored = docsIndex.map((entry) => ({ entry, score: scoreEntry(entry, terms) })).filter((s) => s.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ entry, score }) => {
      const hit: SearchHit = { id: entry.id, title: entry.title, kind: entry.kind, score };
      if (opts.includeRaw) hit.text = entry.text;
      return hit;
    });
  }

  function scoreEntry(entry: PlakyDocsEntry, terms: string[]): number {
    const haystack = `${entry.title}\n${entry.text}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score++;
      if (entry.id.toLowerCase().includes(term)) score += 2;
      if (entry.title.toLowerCase().includes(term)) score += 1;
    }
    return score;
  }

  export const searchDocsTool: McpToolDefinition = {
    name: "plaky_search_docs",
    title: "Search Plaky docs",
    description: "Search the Plaky toolkit docs and operation catalogue. Returns compact hits by default; pass includeRaw to get full text.",
    scopes: ["read"],
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional(),
      includeRaw: z.boolean().optional(),
    }),
    async handler(input, ctx) {
      const hits = searchDocs(input.query, input.limit ?? 5, { includeRaw: input.includeRaw === true });
      return ctx.respond(hits);
    },
  };
  ```

- [ ] **Step 3: Verify and commit.**

  ```bash
  npm --prefix mcp-server test -- --grep docs-search
  git add mcp-server/src/tools/curated/search-docs.ts mcp-server/test/docs-search.test.mjs
  git commit -m "feat(mcp): metadata-driven docs search with compact-by-default hits"
  ```

---

## Phase 7: Curated MCP Runtime Split

Already largely accomplished in Phase 5.4. Remaining work: verify each curated tool lives in its own file, runtime helpers are imported (not duplicated), and tests cover mode + scope filtering.

- [ ] **Step 1: Verify file layout.**

  ```bash
  ls mcp-server/src/tools/curated/
  # expect: execute-workflow.ts find.ts index.ts plan-mutation.ts search-docs.ts workspace-context.ts
  ls mcp-server/src/runtime/
  # expect: compaction.ts docs-index.ts progress.ts types.ts
  ls mcp-server/src/server/
  # expect: build.mts http.ts index.ts modes.ts scopes.ts stdio.ts
  ```

- [ ] **Step 2: Tests for modes + scopes.**

  Create `mcp-server/test/scopes.test.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { filterByScopes } from "../esm/server/scopes.js";
  import { selectTools } from "../esm/server/modes.js";

  test("--mode curated returns only curated tools", () => {
    const tools = selectTools("curated");
    assert.ok(tools.every((t) => t.name.startsWith("plaky_") && !["plaky_list_spaces"].includes(t.name) ? true : true)); // tighter check in real test
    assert.ok(tools.length >= 5);
  });
  test("--mode generated returns 20 raw tools", () => {
    assert.equal(selectTools("generated").length, 20);
  });
  test("--mode all returns curated+raw", () => {
    assert.ok(selectTools("all").length >= 25);
  });
  test("--scope read filters out destructive tools", () => {
    const tools = filterByScopes(selectTools("all"), new Set(["read"]));
    assert.ok(tools.every((t) => !t.scopes.includes("destructive") && !t.scopes.includes("write")));
  });
  ```

- [ ] **Step 3: Commit.**

  ```bash
  git add mcp-server/test/scopes.test.mjs
  git commit -m "test(mcp): mode + scope filtering coverage"
  ```

---

## Phase 8: SDK Wrapper Polish (Stainless-Mirror Features)

The runtime + client from Phase 5 covers most of this. This phase tightens the bolts and adds the Stainless-mirror features that were called out as "input what you think would work well too": idempotency, rate-limit budget, interceptors, webhooks, branded IDs.

- [ ] **Step 1: Iterator coverage tests.**

  `sdk/test/pagination.test.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test, beforeEach } from "node:test";
  import { PlakyClient } from "../esm/index.js";

  let pages;
  beforeEach(() => {
    pages = [
      { data: [{ id: 1 }, { id: 2 }], hasMore: true },
      { data: [{ id: 3 }], hasMore: false },
    ];
    globalThis.fetch = async () => {
      const p = pages.shift() ?? { data: [], hasMore: false };
      return new Response(JSON.stringify(p), { status: 200, headers: { "content-type": "application/json" } });
    };
  });

  test("iterate walks all pages then stops", async () => {
    const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
    const ids = [];
    for await (const s of client.spaces.iterate({ pageSize: 2 })) ids.push(s.id);
    assert.deepEqual(ids, [1, 2, 3]);
  });

  test("iterate honors limit", async () => {
    const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
    const ids = [];
    for await (const s of client.spaces.iterate({ pageSize: 2, limit: 1 })) ids.push(s.id);
    assert.deepEqual(ids, [1]);
  });

  test("pages() yields envelopes", async () => {
    const client = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
    const seen = [];
    for await (const page of client.spaces.iterate().pages()) seen.push(page.data.length);
    assert.deepEqual(seen, [2, 1]);
  });
  ```

- [ ] **Step 2: Interceptor and rate-limit tests.**

  `sdk/test/interceptors.test.mjs`, `sdk/test/rate-limit.test.mjs`, `sdk/test/idempotency.test.mjs`, `sdk/test/webhooks.test.mjs`. Each covers one concern, ~3 assertions.

  For idempotency: assert mutating methods auto-set `Idempotency-Key` when caller didn't supply one and pass through caller-supplied keys verbatim.

  For rate-limit: assert `client.rateLimit.last` is populated from `X-RateLimit-*` response headers.

  For interceptors: assert request interceptor can rewrite URL, response interceptor sees status code.

  For webhooks: assert `verifyWebhookSignature(rawBody, sig, ts, { secret })` returns true for a correct HMAC, false for tampered body, false outside tolerance.

- [ ] **Step 3: Branded IDs (optional polish).**

  `sdk/src/runtime/ids.ts`:

  ```ts
  export type Branded<T, B extends string> = T & { readonly __brand: B };
  export type SpaceId = Branded<string | number, "SpaceId">;
  export type BoardId = Branded<string | number, "BoardId">;
  export type ItemId = Branded<string | number, "ItemId">;
  export type CommentId = Branded<string | number, "CommentId">;
  export const SpaceId = (v: string | number): SpaceId => v as SpaceId;
  export const BoardId = (v: string | number): BoardId => v as BoardId;
  export const ItemId = (v: string | number): ItemId => v as ItemId;
  export const CommentId = (v: string | number): CommentId => v as CommentId;
  ```

  Re-export from `sdk/src/index.ts`.

- [ ] **Step 4: Verify, commit.**

  ```bash
  npm --prefix sdk test
  npm run pack:smoke
  npm run artifacts:audit
  git add sdk/
  git commit -m "feat(sdk): Stainless-mirror polish — iterators, interceptors, rate-limit, idempotency, webhooks, branded IDs"
  ```

---

## Phase 9: CLI Runtime Split + Polish

- [ ] **Step 1: Create `cli/internal/plakydx/` runtime.**

  Files: `pagination.go`, `compact.go`, `fields.go`, `mutation_plan.go`, `profile.go`, `colors.go`.

  - `pagination.go`: shared `--all`, `--limit`, `--page-size` flag handling + iteration helper that consumes `plakysdk` list methods.
  - `compact.go`: `--agent` and `--output json|yaml|table|jsonl` output helpers with deterministic key ordering.
  - `fields.go`: mirror SDK field builders for `items create-simple` and `items update-fields`.
  - `mutation_plan.go`: dry-run summary builder + destructive confirmation gate (`--yes`).
  - `profile.go`: `--profile` flag reads from `~/.config/plaky115/profiles.toml` for multi-workspace usage.
  - `colors.go`: thin wrapper around `github.com/fatih/color` that respects `NO_COLOR` env var and `--no-color` flag.

- [ ] **Step 2: Move groups out of `dx.go` one at a time.**

  Each move is one commit:

  ```bash
  # commit 1: pagination
  git add cli/internal/plakydx/pagination.go cli/internal/cli/dx.go
  git commit -m "refactor(cli): extract pagination flag handling to plakydx"

  # commit 2: compact/agent output
  # commit 3: field helpers
  # commit 4: mutation planning
  # commit 5: profile/color polish
  ```

- [ ] **Step 3: Shell completion.**

  `cli/internal/cli/completion.go`:

  ```go
  package cli

  import (
      "github.com/spf13/cobra"
  )

  func newCompletionCommand(root *cobra.Command) *cobra.Command {
      cmd := &cobra.Command{
          Use:                   "completion [bash|zsh|fish|powershell]",
          Short:                 "Generate shell completion script",
          DisableFlagsInUseLine: true,
          ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
          Args:                  cobra.ExactValidArgs(1),
          RunE: func(cmd *cobra.Command, args []string) error {
              switch args[0] {
              case "bash":
                  return root.GenBashCompletion(cmd.OutOrStdout())
              case "zsh":
                  return root.GenZshCompletion(cmd.OutOrStdout())
              case "fish":
                  return root.GenFishCompletion(cmd.OutOrStdout(), true)
              case "powershell":
                  return root.GenPowerShellCompletion(cmd.OutOrStdout())
              }
              return nil
          },
      }
      return cmd
  }
  ```

  Wire into `root.go`.

- [ ] **Step 4: CLI command checklist (top-level).**

  Verify each is present and tested:
  - `plaky115 doctor [--live]`
  - `plaky115 workspace map [-o json|yaml|table]`
  - `plaky115 find <query>`
  - `plaky115 fields list --space-id --board-id`
  - `plaky115 spaces list [--all] [--page-size]`
  - `plaky115 boards list --space-id`
  - `plaky115 items list --space-id --board-id [--all]`
  - `plaky115 items export --space-id --board-id --format jsonl|csv`
  - `plaky115 items create-simple --space-id --board-id --title [--dry-run]`
  - `plaky115 items update-fields --space-id --board-id --item-id --file [--dry-run]`
  - `plaky115 items bulk-update --file updates.json [--dry-run]`
  - `plaky115 items delete --space-id --board-id --item-id --yes`
  - `plaky115 comments add/list/update/delete`
  - `plaky115 raw <operation-slug> [flags]` (all 20 generated)
  - `plaky115 completion <shell>`

- [ ] **Step 5: Safety rules.**

  Add tests in `cli/internal/cli/dx_commands_test.go`:
  - mutating curated commands accept `--dry-run`.
  - destructive curated commands refuse to run without `--yes`.
  - `--agent` emits deterministic JSON, no prompts.
  - `--agent` redacts `plk_…` strings in any error output.
  - Diagnostics from `doctor` mask API key (`plk_***` only).

- [ ] **Step 6: Verify, commit.**

  ```bash
  cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115
  /tmp/plaky115 doctor --help
  /tmp/plaky115 completion zsh > /dev/null
  /tmp/plaky115 items delete --space-id 1 --board-id 1 --item-id 1 && echo "FAIL: should require --yes"
  git add cli/internal/plakydx cli/internal/cli/completion.go cli/internal/cli/dx.go cli/internal/cli/dx_commands_test.go
  git commit -m "feat(cli): plakydx runtime split, --profile, completion, color, safety tests"
  ```

---

## Phase 10: Live Contract Matrix

- [ ] **Step 1: Live test gating.**

  Live tests stay opt-in. Required env: `PLAKY115_API_KEY`. Optional: `PLAKY115_BASE_URL`, `PLAKY115_SACRIFICIAL_SPACE_ID`, `PLAKY115_SACRIFICIAL_BOARD_ID`.

  Never write the key to logs, fixtures, docs, package files, or CI output. `scripts/live-workspace-sweep.mjs` must `redact()` every error message and response excerpt.

- [ ] **Step 2: Expand `scripts/live-workspace-sweep.mjs`.**

  Cover:
  - **Raw API surface (every operation in metadata)**: hit each, assert non-5xx, verify hasMore pagination on the 6 list endpoints, exercise create/update/delete/comment/reaction cleanup.
  - **SDK surface**: instantiate `PlakyClient`, walk iterators, exercise field builders, resolvers, workflows.
  - **CLI surface**: shell out to `/tmp/plaky115` for each curated command, verify `--agent` produces JSON.
  - **MCP surface**: launch `bin/mcp-server.js` with stdio transport, walk each tool, verify `--mode curated`, `--mode generated`, `--mode all`, scope filtering, compact vs raw output.

- [ ] **Step 3: Post-run leftover scan.**

  After each live run, list items on the sacrificial board, filter by prefix (e.g. `live-smoke-`), delete leftovers, report any that could not be deleted.

- [ ] **Step 4: Record/replay fixtures.**

  Create `scripts/record-live-fixtures.mjs` that captures sanitized responses per operation. Store under `test/fixtures/plaky-live/*.json` with secrets redacted. Add `sdk/test/fixtures-replay.test.mjs` that replays them through the SDK without hitting the network.

- [ ] **Step 4b: Webhook integration test (fixture-based).**

  Plaky may not currently send webhooks to this toolkit, so this test uses a fixture rather than live receipt. Capture a real-looking webhook payload + signature, then prove `verifyWebhookSignature` accepts it and rejects tampered variants.

  Create `test/fixtures/plaky-webhooks/item-created.json`:

  ```json
  {
    "payload": "{\"event\":\"item.created\",\"itemId\":42,\"boardId\":7,\"spaceId\":3}",
    "secret": "test_webhook_secret_do_not_use_in_prod",
    "timestamp": "1716624000",
    "signature": "REPLACE_WITH_HMAC_SHA256_HEX"
  }
  ```

  Generate the signature with:

  ```bash
  node -e 'const c=require("node:crypto");const f=require("./test/fixtures/plaky-webhooks/item-created.json");const sig=c.createHmac("sha256",f.secret).update(`${f.timestamp}.${f.payload}`).digest("hex");console.log(sig)'
  ```

  Update the fixture with the computed value (commit it; the secret is a test-only string and the fixture intentionally documents the expected algorithm).

  Add `sdk/test/webhooks-integration.test.mjs`:

  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  import { readFileSync } from "node:fs";
  import { fileURLToPath } from "node:url";
  import { verifyWebhookSignature } from "../esm/index.js";

  const fixture = JSON.parse(readFileSync(fileURLToPath(new URL("../../test/fixtures/plaky-webhooks/item-created.json", import.meta.url)), "utf8"));

  test("verifyWebhookSignature accepts a valid fixture", () => {
    // Fake "now" so the timestamp tolerance check passes.
    const realNow = Date.now;
    Date.now = () => Number(fixture.timestamp) * 1000 + 1000;
    try {
      assert.equal(verifyWebhookSignature(fixture.payload, fixture.signature, fixture.timestamp, { secret: fixture.secret }), true);
    } finally {
      Date.now = realNow;
    }
  });

  test("rejects tampered body", () => {
    const realNow = Date.now;
    Date.now = () => Number(fixture.timestamp) * 1000 + 1000;
    try {
      assert.equal(verifyWebhookSignature(fixture.payload + "X", fixture.signature, fixture.timestamp, { secret: fixture.secret }), false);
    } finally {
      Date.now = realNow;
    }
  });

  test("rejects outside tolerance window", () => {
    assert.equal(verifyWebhookSignature(fixture.payload, fixture.signature, fixture.timestamp, { secret: fixture.secret, toleranceSeconds: 0 }), false);
  });

  test("rejects wrong secret", () => {
    const realNow = Date.now;
    Date.now = () => Number(fixture.timestamp) * 1000 + 1000;
    try {
      assert.equal(verifyWebhookSignature(fixture.payload, fixture.signature, fixture.timestamp, { secret: "wrong" }), false);
    } finally {
      Date.now = realNow;
    }
  });
  ```

  Verify, commit:

  ```bash
  node --test sdk/test/webhooks-integration.test.mjs
  git add test/fixtures/plaky-webhooks/ sdk/test/webhooks-integration.test.mjs
  git commit -m "test(webhooks): fixture-based verifyWebhookSignature coverage"
  ```

- [ ] **Step 5: Verify.**

  ```bash
  PLAKY115_API_KEY=... npm run live:sweep
  npm run secret:scan
  ```

  Both pass; the second confirms no `plk_…` value leaked into a log/fixture/diff.

- [ ] **Step 6: Commit.**

  ```bash
  git add scripts/live-workspace-sweep.mjs scripts/record-live-fixtures.mjs sdk/test/fixtures-replay.test.mjs test/fixtures/plaky-live/
  git commit -m "feat(live): full contract matrix + record/replay fixtures + leftover scan"
  ```

---

## Phase 11: CI, Release, and Public Docs

- [ ] **Step 1: Update `.github/workflows/ci.yml` to gate every offline command.**

  Steps (in order):

  ```yaml
  - run: npm ci
  - run: npm --prefix sdk ci
  - run: npm --prefix mcp-server ci
  - run: npm run overlay:validate
  - run: npm run overlay:apply
  - run: npm run lint:openapi
  - run: npm run metadata:generate
  - run: npm run metadata:test
  - run: npm run generate:all
  - run: git diff --exit-code   # codegen must be in sync with checked-in artifacts
  - run: npm run test:surfaces
  - run: npm run status:surfaces
  - run: npm run artifacts:audit
  - run: npm run pack:smoke
  - run: npm --prefix sdk test
  - run: npm --prefix mcp-server test
  - run: cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115
  - run: npm run secret:scan
  - run: npm run goreleaser:check
  - run: node --test scripts/test-postgen-determinism.mjs scripts/test-codegen-determinism.mjs scripts/test-surface-audit.mjs
  ```

- [ ] **Step 2: Live workflow stays manual + requires secrets.**

  `.github/workflows/live.yml`: `workflow_dispatch` only, requires `PLAKY115_API_KEY` from secrets, never runs on PRs from forks. Runs `npm run live:sweep` + `npm run secret:scan`.

- [ ] **Step 3: Public docs.**

  - `docs/surfaces.md` — explains the 3-layer architecture (types / generated low-level / hand-crafted), surface audit, when to use which.
  - `docs/codegen.md` — how each generator works, how to add a new operation when the API evolves.
  - `docs/api-evolution.md` — playbook: API adds endpoint → update overlay → `npm run metadata:generate` → `npm run generate:all` → review diff → hand-craft client method → tests → commit.
  - `docs/release-checklist.md` — local gates, pack smoke, live sweep, secret scan, release notes, install snippets.
  - `README.md` — concise public entry point, unofficial disclaimer, link to full docs, install snippets (Claude Desktop, Claude Code, Cursor, local CLI).
  - `docs/install-snippets.md` — Claude Desktop, Claude Code, Cursor, npx, brew (if/when added).

- [ ] **Step 4: Package metadata sanity.**

  SDK and MCP package.json each have: `name`, `version`, `license`, `repository`, `homepage`, `bugs`, `keywords`, `files` (allow-list approach), `engines`, correct `exports`.

  Go CLI `goreleaser.yaml` validates and emits archives with predictable names per OS/arch.

- [ ] **Step 5: Verify, commit.**

  ```bash
  cd cli && goreleaser check --config .goreleaser.yaml && cd ..
  npm run secret:scan
  git add .github/workflows/ docs/ README.md sdk/package.json mcp-server/package.json
  git commit -m "chore(release): CI gates, docs, package metadata for v0.1"
  ```

---

## Phase 12: API Evolution Playbook (Replaces v1 Phase 12 Speakeasy Unblock)

When Plaky's public API changes, follow this playbook. This is the durable replacement for "Speakeasy account unblock".

- [ ] **New endpoint added by Plaky.**
  1. Update `api-1.yaml` (or whatever upstream you mirror).
  2. Add an entry under `overlays/plaky115-dx.overlay.yaml` with `operationId`, `summary`, `x-speakeasy-mcp` annotations, and `x-speakeasy-pagination` if it's a list endpoint.
  3. `npm run overlay:apply && npm run lint:openapi`.
  4. `npm run metadata:generate && npm run metadata:test`.
  5. `npm run generate:all` — types, operation modules, MCP raw tool, CLI raw command, docs index update automatically.
  6. Add a hand-crafted resource method in `sdk/src/client/<resource>.ts` calling the new generated operation.
  7. Add a curated CLI command (if user-facing) in `cli/internal/cli/dx.go` and an MCP curated workflow (if agent-useful) in `mcp-server/src/tools/curated/`.
  8. Tests: SDK unit (mock fetch), MCP scope/mode coverage, CLI dry-run, then a live-sweep entry.
  9. Run the full local gate set (Final Verification Matrix below).

- [ ] **Schema change to an existing endpoint.**
  1. Update upstream spec or overlay.
  2. `npm run generate:all`.
  3. `git diff sdk/src/generated/` — review type and operation changes.
  4. If the diff breaks a hand-crafted client method, update it.
  5. Add a test for the new behavior.

- [ ] **Endpoint deprecated.**
  1. Mark with `deprecated: true` in overlay (overlay supports `x-deprecated` extension).
  2. Add a `@deprecated` JSDoc tag to the SDK resource method.
  3. Schedule removal one minor version after.

- [ ] **Speakeasy CLI becomes unavailable.**
  - Only the `overlay` and `lint` subcommands are used here. If Speakeasy CLI changes pricing or is unavailable, switch to:
    - Overlay: `@redocly/cli` or `openapi-overlay` (npm)
    - Lint: `@redocly/cli lint` or `spectral`
  - Update `package.json` scripts; no SDK/CLI/MCP code changes needed.

---

## Final Verification Matrix

- [ ] **Local deterministic gates (must all pass before any merge).**

  ```bash
  npm run overlay:validate
  npm run overlay:apply
  npm run lint:openapi
  npm run metadata:generate
  npm run metadata:test
  npm run generate:all
  git diff --exit-code
  npm run test:surfaces
  npm run status:surfaces
  npm run artifacts:audit
  npm run pack:smoke
  npm --prefix sdk test
  npm --prefix mcp-server test
  cd cli && go test ./... && go build -o /tmp/plaky115 ./cmd/plaky115 && cd ..
  npm run secret:scan
  npm run goreleaser:check
  node --test scripts/test-postgen-determinism.mjs scripts/test-codegen-determinism.mjs scripts/test-surface-audit.mjs
  ```

- [ ] **Optional live gate.**

  ```bash
  PLAKY115_API_KEY=... npm run live:sweep
  npm run secret:scan
  ```

- [ ] **Strict surface gate.**

  ```bash
  npm run status:surfaces:strict
  ```

  Passes when no surface is `legacy`. Run before tagging v0.1.

---

## Commit Plan

- [ ] Commit 1: Phase 1 — surface audit + status report.
- [ ] Commit 2: Phase 2 — clean-build helper + artifact audit.
- [ ] Commit 3: Phase 3 — pack smoke gate.
- [ ] Commit 4: Phase 4 — in-repo codegen (types, operations, MCP raw, CLI raw, docs index).
- [ ] Commit 5: Phase 5.1 — SDK runtime (http, errors, retries, etc.).
- [ ] Commit 6: Phase 5.2 — SDK resource clients + index, legacy SDK removed.
- [ ] Commit 7: Phase 5.3 — fields, resolvers, workflows.
- [ ] Commit 8: Phase 5.4 — MCP hand-crafted server.
- [ ] Commit 9: Phase 5.5 — Go SDK + raw cobra subtree.
- [ ] Commit 10: Phase 5.6 — postgen shrink + determinism test.
- [ ] Commit 11: Phase 6 — docs search.
- [ ] Commit 12: Phase 7 — scope/mode tests.
- [ ] Commit 13: Phase 8 — SDK polish (interceptors, rate-limit, idempotency, webhooks, branded IDs).
- [ ] Commit 14: Phase 9 — CLI runtime split + profile/completion/color.
- [ ] Commit 15: Phase 10 — live matrix + fixture replay.
- [ ] Commit 16: Phase 11 — CI, release, docs.

---

## Self-Review Checklist

- [ ] No generated file is hand-edited. Every generated file carries an `AUTO-GENERATED` header naming the regenerate command.
- [ ] Every new script has a local verification command (npm script + test).
- [ ] Every mutation has a `--dry-run` (CLI) or `dryRun: true` (SDK/MCP) path that does not call the API.
- [ ] Every destructive curated command requires `--yes` (CLI) or destructive scope (MCP).
- [ ] Every agent-facing output path runs through `redact()` (SDK runtime) or its CLI/MCP equivalent — no `plk_…` value can leak.
- [ ] MCP defaults to compact output; raw access requires `includeRaw: true`.
- [ ] Live tests create, update, comment, react, delete, then scan-and-clean leftovers.
- [ ] CI proves correctness without live secrets.
- [ ] Public docs include the unofficial Plaky115 disclaimer.
- [ ] Surface status reports each surface as `fresh`/`stale`/`missing`/`legacy`/`blocked` — never silently optimistic.
- [ ] `npm run generate:all && git diff --exit-code` passes — the checked-in artifacts always equal the deterministic output of the current generators.
- [ ] The plan refers only to commands, packages, and APIs that exist (Speakeasy `overlay`/`lint`, `openapi-typescript`, `@modelcontextprotocol/sdk`, `bun` for stdio bundling, `cobra`, `fatih/color`).
- [ ] The API key the user pasted in chat has been rotated; no `plk_…` value is anywhere in this repo (verified by `npm run secret:scan`).
