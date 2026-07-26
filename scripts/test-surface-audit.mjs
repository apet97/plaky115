import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSurfaceReport } from "./lib/surface-audit.mjs";

test("surface report classifies each surface", async () => {
  const report = await buildSurfaceReport(new URL("..", import.meta.url));

  // Spec
  assert.equal(report.spec.operationCount, report.spec.operationIds.length);
  assert.equal(new Set(report.spec.operationIds).size, report.spec.operationIds.length);
  assert.ok(report.spec.operationIds.includes("getCurrentUser"));
  assert.ok(report.spec.operationIds.includes("replaceCommentReactions"));

  // Generated types
  assert.match(report.sdk.generatedTypes.status, /^(fresh|missing)$/);

  // Generated operations are no longer part of the TypeScript SDK surface.
  assert.equal(report.sdk.legacy.generatedOperations, false);

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

test("operation slugs are kebab-cased correctly", async () => {
  const report = await buildSurfaceReport(new URL("..", import.meta.url));
  const ids = report.spec.operationIds;
  assert.ok(ids.every((id) => /^[a-z][A-Za-z0-9]+$/.test(id)), `invalid operation IDs: ${ids.join(", ")}`);
});
