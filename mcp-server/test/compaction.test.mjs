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

test("compactByKind uses the exact Item Group fields for single and paged results", () => {
  const group = { id: 5, title: "Doing", color: "#123456", ranking: "m", fields: ["not-a-board"] };
  assert.deepEqual(compactByKind(group, "itemGroup"), {
    id: 5,
    title: "Doing",
    color: "#123456",
    ranking: "m",
  });
  assert.deepEqual(compactByKind({ data: [group], hasMore: true }, "itemGroup"), {
    data: [{ id: 5, title: "Doing", color: "#123456", ranking: "m" }],
    hasMore: true,
  });
});

test("compactByKind uses the exact Item file fields", () => {
  const file = {
    id: 6,
    name: "report.pdf",
    description: "Quarterly report",
    size: 123,
    extension: "pdf",
    fileType: "PDF",
    uploadedBy: 7,
    createdAt: "2026-07-26T00:00:00Z",
    title: "not-an-item",
  };
  assert.deepEqual(compactByKind(file, "itemFile"), {
    id: 6,
    name: "report.pdf",
    description: "Quarterly report",
    size: 123,
    extension: "pdf",
    fileType: "PDF",
    uploadedBy: 7,
    createdAt: "2026-07-26T00:00:00Z",
  });
});

test("compactByKind preserves download URL and expiry only", () => {
  const url = "https://download.example.test/signed?opaque=abc";
  assert.deepEqual(compactByKind({ url, expiresInSeconds: 120, ignored: true }, "downloadLink"), {
    url,
    expiresInSeconds: 120,
  });
});

test("compactByKind normalizes a bare Item file array only at the MCP boundary", () => {
  assert.deepEqual(compactByKind([{ id: 1, name: "one.txt" }], "itemFile"), {
    data: [{ id: 1, name: "one.txt" }],
    hasMore: false,
  });
});

test("includeRaw appears once on a list and not recursively on its elements", () => {
  const raw = { data: [{ id: 1, name: "one.txt", ignored: true }], hasMore: false };
  const compacted = compactByKind(raw, "itemFile", { includeRaw: true });
  assert.deepEqual(compacted, {
    data: [{ id: 1, name: "one.txt" }],
    hasMore: false,
    raw,
  });
  assert.equal("raw" in compacted.data[0], false);
});

test("new compactors tolerate missing fields and centralized serialization redacts API keys", () => {
  const token = "plk_" + "TEST_SECRET-ABC123";
  assert.deepEqual(compactByKind({}, "itemGroup"), {});
  assert.deepEqual(compactByKind(null, "itemFile"), {});
  assert.deepEqual(compactByKind({}, "downloadLink"), {});
  assert.deepEqual(structuredForMcp({ file: compactByKind({ name: token }, "itemFile") }), { file: { name: "plk_***" } });
});
