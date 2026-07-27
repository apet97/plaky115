import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildContractInventory,
  formatContractInventory,
} from "./print-contract-inventory.mjs";

const repositoryRoot = new URL("..", import.meta.url);

test("current metadata has 32 unique operations and deterministic inventory", async () => {
  const metadata = JSON.parse(
    await readFile(new URL("openapi/plaky115-operation-metadata.json", repositoryRoot), "utf8"),
  );

  const inventory = await buildContractInventory(metadata, repositoryRoot);

  assert.equal(inventory.operationCount, 32);
  assert.equal(inventory.operationIds.length, 32);
  assert.equal(inventory.methodPathKeys.length, 32);
  assert.equal(new Set(inventory.operationIds).size, 32);
  assert.equal(new Set(inventory.methodPathKeys).size, 32);
  assert.equal(inventory.rawSurfaceFileCounts.cli, 32);
  assert.equal(inventory.rawSurfaceFileCounts.mcp, 32);
  assert.equal(formatContractInventory(inventory), formatContractInventory(inventory));
});

test("inventory rejects duplicate operation IDs", async () => {
  const metadata = {
    operations: [
      operation("same", "GET", "/one"),
      operation("same", "GET", "/two"),
    ],
  };

  await assert.rejects(
    buildContractInventory(metadata, repositoryRoot),
    /duplicate operationId: same/,
  );
});

test("inventory rejects duplicate method and path keys", async () => {
  const metadata = {
    operations: [
      operation("first", "GET", "/same"),
      operation("second", "GET", "/same"),
    ],
  };

  await assert.rejects(
    buildContractInventory(metadata, repositoryRoot),
    /duplicate method\/path: GET \/same/,
  );
});

function operation(operationId, method, path) {
  return {
    operationId,
    method,
    path,
    mutation: method !== "GET",
    destructive: method === "DELETE",
  };
}
