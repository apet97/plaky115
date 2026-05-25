import assert from "node:assert/strict";
import { test } from "node:test";
import { compactByKind } from "../esm/runtime/compaction.js";

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
