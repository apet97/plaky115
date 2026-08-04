import assert from "node:assert/strict";
import { test } from "node:test";
import { PlakyPartialMutationError } from "../esm/index.js";

test("PlakyPartialMutationError freezes copied receipts without serializing its cause", () => {
  const cause = new Error("transport failed");
  const receipt = {
    operation: "items.updateFields",
    index: 0,
    status: "ambiguous",
    attempted: true,
    mayHaveCommitted: true,
    phase: "request",
    targetIds: { itemId: "9007199254740993" },
  };

  const error = new PlakyPartialMutationError("failed plk_secret", [receipt], { cause, failedIndex: 0 });

  assert.notEqual(error.receipts, [receipt]);
  assert.equal(error.receipts[0]?.targetIds.itemId, "9007199254740993");
  assert.equal(error.failedIndex, 0);
  assert.equal(error.cause, cause);
  assert.ok(Object.isFrozen(error.receipts));
  assert.ok(Object.isFrozen(error.receipts[0]));
  assert.ok(Object.isFrozen(error.receipts[0].targetIds));
  assert.doesNotMatch(error.message, /plk_secret/);
  assert.doesNotMatch(JSON.stringify(error), /transport failed|plk_secret/);

  assert.throws(() => error.receipts.push(receipt), TypeError);
  assert.throws(() => {
    error.receipts[0].targetIds.itemId = "1";
  }, TypeError);
});
