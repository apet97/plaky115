import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fieldValues,
  stringField,
  statusField,
  tagField,
  personField,
  timelineField,
  linkField,
  numberField,
} from "../esm/index.js";

test("fieldValues is identity", () => {
  const v = fieldValues({ Status: "Done", Count: 7 });
  assert.deepEqual(v, { Status: "Done", Count: 7 });
});

test("stringField passes through", () => {
  assert.equal(stringField("hello"), "hello");
});

test("statusField accepts string or number", () => {
  assert.equal(statusField("Done"), "Done");
  assert.equal(statusField(3), 3);
});

test("tagField returns array as-is", () => {
  assert.deepEqual(tagField(["a", "b", 7]), ["a", "b", 7]);
});

test("personField normalizes numeric user/team refs to {id}", () => {
  const out = personField({ users: [1, { id: 2, email: "x@y" }], teams: [10, { id: 11, title: "Ops" }] });
  assert.deepEqual(out.users, [{ id: 1 }, { id: 2, email: "x@y" }]);
  assert.deepEqual(out.teams, [{ id: 10 }, { id: 11, title: "Ops" }]);
});

test("personField omits undefined collections", () => {
  const out = personField({ users: [1] });
  assert.ok(!("teams" in out));
});

test("timelineField requires both start and end", () => {
  assert.deepEqual(timelineField({ start: "2026-01-01", end: "2026-01-31" }), { start: "2026-01-01", end: "2026-01-31" });
  assert.throws(() => timelineField({ start: "", end: "x" }), /both start and end/);
});

test("linkField requires url", () => {
  assert.deepEqual(linkField({ url: "https://x" }), { url: "https://x" });
  assert.throws(() => linkField({ url: "" }), /url is required/);
});

test("numberField rejects non-finite", () => {
  assert.equal(numberField(42), 42);
  assert.throws(() => numberField(NaN), /finite number/);
  assert.throws(() => numberField(Infinity), /finite number/);
});
