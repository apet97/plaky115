import assert from "node:assert/strict";
import { test } from "node:test";
import { createProgressReporter } from "../esm/runtime/progress.js";

test("progress reporter emits bounded milestones and the final value", async () => {
  const updates = [];
  const report = createProgressReporter(async (progress, total, message) => { updates.push({ progress, total, message }); }, 100, "items scanned", 10);
  for (let value = 1; value <= 100; value++) await report(value);
  assert.equal(updates.length, 10);
  assert.deepEqual(updates.at(-1), { progress: 100, total: 100, message: "items scanned" });
});

test("progress reporter waits for delivery order and treats notification failure as best-effort", async () => {
  const updates = [];
  const report = createProgressReporter(async (progress) => {
    updates.push(`start:${progress}`);
    await Promise.resolve();
    updates.push(`end:${progress}`);
    if (progress === 2) throw new Error("disconnected");
  }, 3, "items scanned", 3);
  for (const value of [1, 2, 3]) await report(value);
  assert.deepEqual(updates, ["start:1", "end:1", "start:2", "end:2", "start:3", "end:3"]);
});
