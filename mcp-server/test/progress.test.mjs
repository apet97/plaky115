import assert from "node:assert/strict";
import { test } from "node:test";
import { createProgressReporter } from "../esm/runtime/progress.js";

test("progress reporter emits bounded milestones and the final value", async () => {
  const updates = [];
  const report = createProgressReporter(async (progress, total, message) => { updates.push({ progress, total, message }); }, 100, "items scanned", 10);
  for (let value = 1; value <= 100; value++) report(value);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(updates.length, 10);
  assert.deepEqual(updates.at(-1), { progress: 100, total: 100, message: "items scanned" });
});
