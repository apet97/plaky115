import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { redact, redactRecord } from "../esm/runtime/redact.js";

const corpusPath = new URL("../../test/fixtures/security/plaky-api-key-cases.json", import.meta.url);
const corpusSource = await readFile(corpusPath, "utf8");
const corpus = JSON.parse(corpusSource);

const join = (parts) => parts.join("");
const valueFor = (name) => join(corpus.cases.find((entry) => entry.name === name).inputParts);

test("redact follows the shared split-literal corpus", () => {
  assert.doesNotMatch(corpusSource, /plk_[A-Za-z0-9_-]+/);
  for (const entry of corpus.cases) {
    assert.equal(redact(join(entry.inputParts)), join(entry.expectedParts), entry.name);
  }
});

test("redactRecord scrubs nested records without mutating the source", () => {
  const token = valueFor("underscore");
  const source = { auth: `Bearer ${token}`, nested: { values: [token, "safe"] } };

  const redacted = redactRecord(source);

  assert.deepEqual(redacted, {
    auth: `Bearer ${corpus.marker}`,
    nested: { values: [corpus.marker, "safe"] },
  });
  assert.equal(source.nested.values[0], token);
});

test("redact scrubs API error bodies and every match", () => {
  const first = valueFor("shortest-tail");
  const second = valueFor("hyphen");
  const body = JSON.stringify({ message: `${first} then ${second}` });

  assert.equal(redact(body), JSON.stringify({ message: `${corpus.marker} then ${corpus.marker}` }));
});
