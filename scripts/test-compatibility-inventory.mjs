import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const inventory = await readFile(`${root}/docs/compatibility-inventory.md`, "utf8");
const sdkIndex = await readFile(`${root}/sdk/src/index.ts`, "utf8");
const sdkPackage = JSON.parse(await readFile(`${root}/sdk/package.json`, "utf8"));
const mcpIndex = await readFile(`${root}/mcp-server/src/tools/curated/index.ts`, "utf8");
const cliReadme = await readFile(`${root}/cli/README.md`, "utf8");

test("compatibility inventory covers required public contracts", () => {
  for (const text of ["PlakyClient", "requestWithResponse()", "searchItems()", "exportItems()", "items-export", "plaky_execute_workflow", "workspace/export envelopes"]) {
    assert.match(inventory, new RegExp(escapeRegExp(text)), `inventory missing ${text}`);
  }
  assert.match(sdkIndex, /export \{ PlakyClient/);
  assert.ok(sdkPackage.exports["./runtime/http.js"]);
  assert.match(mcpIndex, /plaky_execute_workflow|executeWorkflow/);
  assert.match(cliReadme, /recoverable backup/);
});

test("documented deprecated bridges remain in source surfaces", () => {
  assert.match(inventory, /deprecated bridge/);
  assert.match(sdkIndex, /searchItems/);
  assert.match(mcpIndex, /execute-workflow|executeWorkflow/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
