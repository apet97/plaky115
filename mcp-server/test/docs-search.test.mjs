import assert from "node:assert/strict";
import { test } from "node:test";
import { searchDocs } from "../esm/tools/curated/index.js";

test("query 'list spaces' returns the listSpaces operation", () => {
  const hits = searchDocs("list spaces", 5);
  assert.ok(hits.some((h) => h.id === "op:listSpaces"));
});

test("query 'replace reactions' returns replaceCommentReactions", () => {
  const hits = searchDocs("replace reactions", 5);
  assert.ok(hits.some((h) => h.id === "op:replaceCommentReactions"));
});

test("default response omits raw text", () => {
  const hits = searchDocs("workspace map", 3);
  assert.ok(hits.length > 0);
  assert.ok(hits.every((h) => !("text" in h)));
});

test("includeRaw includes source text", () => {
  const hits = searchDocs("workspace map", 3, { includeRaw: true });
  assert.ok(hits.length > 0);
  assert.ok(hits.some((h) => typeof h.text === "string" && h.text.length > 0));
});

test("empty query returns no hits", () => {
  assert.deepEqual(searchDocs("", 5), []);
});
