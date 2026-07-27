import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanupOwnedArtifacts,
  collectPages,
  createArtifactLedger,
  createRunMarker,
  isOwnedArtifact,
  trackArtifact,
} from "./live-workspace-sweep.mjs";

const RUN_A = "11111111-1111-4111-8111-111111111111";
const RUN_B = "22222222-2222-4222-8222-222222222222";

test("run marker and ownership predicate are exact to one UUID", () => {
  const markerA = createRunMarker(RUN_A);
  const markerB = createRunMarker(RUN_B);
  assert.equal(markerA, `smoke:plaky115:${RUN_A}:`);
  assert.equal(isOwnedArtifact({ title: `${markerA}item` }, markerA), true);
  assert.equal(isOwnedArtifact({ name: `${markerA}file.txt` }, markerA), true);
  assert.equal(isOwnedArtifact({ content: `${markerA}comment` }, markerA), true);
  assert.equal(isOwnedArtifact({ title: `${markerB}item` }, markerA), false);
  assert.equal(isOwnedArtifact({ title: "smoke:unrelated" }, markerA), false);
  assert.equal(isOwnedArtifact({ title: `prefix ${markerA}item` }, markerA), false);
});

test("collectPages drains pagination to exhaustion in order", async () => {
  const calls = [];
  const records = await collectPages(async (page) => {
    calls.push(page);
    return page === 1
      ? { data: [{ id: 1 }], hasMore: true }
      : { data: [{ id: 2 }], hasMore: false };
  });
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(records.map((entry) => entry.id), [1, 2]);
});

test("cleanup deletes known children before parents", async () => {
  const marker = createRunMarker(RUN_A);
  const ledger = createArtifactLedger(marker);
  trackArtifact(ledger, "groups", { id: "g", title: `${marker}group`, surface: "sdk", operation: "create" });
  trackArtifact(ledger, "items", { id: "i", title: `${marker}item`, surface: "api", operation: "create" });
  trackArtifact(ledger, "comments", { id: "c", itemId: "i", content: `${marker}comment`, surface: "mcp", operation: "create" });
  trackArtifact(ledger, "files", { id: "f", itemId: "i", name: `${marker}file.txt`, surface: "cli", operation: "upload" });
  const removed = [];
  const adapters = Object.fromEntries(["comments", "files", "items", "groups"].map((family) => [family, {
    list: async () => [],
    remove: async (artifact) => removed.push(`${family}:${artifact.id}`),
  }]));

  const result = await cleanupOwnedArtifacts({ ledger, adapters });

  assert.deepEqual(removed, ["comments:c", "files:f", "items:i", "groups:g"]);
  assert.deepEqual(result.leftovers, { comments: 0, files: 0, items: 0, groups: 0 });
});

test("lost-response discovery removes only this run and preserves a concurrent run", async () => {
  const markerA = createRunMarker(RUN_A);
  const markerB = createRunMarker(RUN_B);
  const ledger = createArtifactLedger(markerA);
  const items = [
    { id: "a", title: `${markerA}lost-response` },
    { id: "b", title: `${markerB}concurrent` },
  ];
  let listCalls = 0;
  const adapters = emptyAdapters();
  adapters.items = {
    list: async () => {
      listCalls++;
      return [...items];
    },
    remove: async (artifact) => items.splice(items.findIndex((item) => item.id === artifact.id), 1),
  };

  const result = await cleanupOwnedArtifacts({ ledger, adapters });

  assert.deepEqual(items, [{ id: "b", title: `${markerB}concurrent` }]);
  assert.equal(result.discovered.items, 1);
  assert.equal(listCalls, 2, "discovery and final rescan must both run");
});

test("cleanup aggregates errors, continues, and fails after final rescan", async () => {
  const marker = createRunMarker(RUN_A);
  const ledger = createArtifactLedger(marker);
  trackArtifact(ledger, "comments", { id: "c", content: `${marker}comment` });
  trackArtifact(ledger, "items", { id: "i", title: `${marker}item` });
  const removed = [];
  const adapters = emptyAdapters();
  adapters.comments = {
    list: async () => [{ id: "c", content: `${marker}comment` }],
    remove: async () => {
      removed.push("comment");
      throw new Error("comment delete failed");
    },
  };
  adapters.items = {
    list: async () => [],
    remove: async () => removed.push("item"),
  };

  await assert.rejects(
    cleanupOwnedArtifacts({ ledger, adapters }),
    (error) => error instanceof AggregateError && error.errors.length >= 2,
  );
  assert.ok(removed.includes("item"), "parent cleanup must continue after a child failure");
});

function emptyAdapters() {
  return Object.fromEntries(["comments", "files", "items", "groups"].map((family) => [family, {
    list: async () => [],
    remove: async () => {},
  }]));
}
