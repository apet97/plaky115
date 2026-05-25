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

test("operation slugs are kebab-cased correctly", async () => {
  const report = await buildSurfaceReport(new URL("..", import.meta.url));
  const ids = report.spec.operationIds;
  // Ensure all 20 expected operations are present
  const expected = [
    "listSpaces", "listTeams", "listUsers", "listBoards", "listItems",
    "createItem", "getSpace", "getTeam", "getCurrentUser", "getBoard",
    "listSubitems", "getItem", "deleteItem", "updateItemField", "updateItemFields",
    "listItemComments", "createItemComment", "updateItemComment", "deleteItemComment",
    "replaceCommentReactions",
  ];
  for (const id of expected) assert.ok(ids.includes(id), `missing ${id}`);
});
