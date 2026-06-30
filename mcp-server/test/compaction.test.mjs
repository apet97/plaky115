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

test("compactByKind keeps the comment body and author id (content/createdBy)", () => {
  const compacted = compactByKind(
    { id: 42, content: "Looks good", text: "Looks good", createdAt: "t", createdBy: 7, deleted: false },
    "comment",
  );
  assert.deepEqual(compacted, { id: 42, content: "Looks good", text: "Looks good", createdAt: "t", createdBy: 7 });
});

test("compactByKind normalizes a bare comment array into a paged shape with bodies preserved", () => {
  const compacted = compactByKind(
    [
      { id: 1, content: "first", createdAt: "a", createdBy: 7 },
      { id: 2, content: "second", createdAt: "b", createdBy: 8 },
    ],
    "comment",
  );
  assert.deepEqual(compacted, {
    data: [
      { id: 1, content: "first", createdAt: "a", createdBy: 7 },
      { id: 2, content: "second", createdAt: "b", createdBy: 8 },
    ],
    hasMore: false,
  });
});

test("compactByKind leaves a reactions keyed-map untouched under raw", () => {
  const reactions = { "1f44d": [{ userId: 7, reactedAt: "t" }] };
  assert.deepEqual(compactByKind(reactions, "raw"), reactions);
});

test("structuredForMcp wraps primitives and redacts secret-shaped values", () => {
  const token = "plk_" + "TEST_SECRET-ABC123";

  assert.deepEqual(structuredForMcp("plain"), { value: "plain" });
  assert.deepEqual(structuredForMcp({ message: `echo ${token}` }), { message: "echo plk_***" });
});
