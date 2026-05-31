import assert from "node:assert/strict";
import { test } from "node:test";
import { compactByKind, structuredForMcp } from "../esm/runtime/compaction.js";

test("compactByKind preserves paged data for typed lists", () => {
  const compacted = compactByKind(
    { data: [{ id: 1, title: "A", ignored: true }], hasMore: false },
    "item",
  );

  assert.deepEqual(compacted, {
    data: [{ id: 1, title: "A" }],
    hasMore: false,
  });
});

test("structuredForMcp wraps primitives and redacts secret-shaped values", () => {
  const token = "plk_" + "TEST_SECRET-ABC123";

  assert.deepEqual(structuredForMcp("plain"), { value: "plain" });
  assert.deepEqual(structuredForMcp({ message: `echo ${token}` }), { message: "echo plk_***" });
});
