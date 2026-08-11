import assert from "node:assert/strict";
import { test } from "node:test";
import {
  UploadValidationError,
  normalizeBase64UploadPlan,
  normalizeItemCreatePlan,
  normalizeItemGroupCreatePlan,
  normalizeItemGroupUpdatePlan,
  normalizeItemUpdateFieldsPlan,
} from "../esm/index.js";

test("item plans canonicalize exact IDs and keep empty field updates valid", () => {
  const create = normalizeItemCreatePlan({ spaceId: 1, boardId: "9007199254740992", body: {} });
  assert.deepEqual(create.targetIds, { spaceId: "1", boardId: "9007199254740992" });
  assert.deepEqual(create.body, {});
  assert.equal(create.requiresLiveResolution, false);

  const update = normalizeItemUpdateFieldsPlan({ spaceId: 1, boardId: 2, itemId: "9007199254740993", body: {} });
  assert.equal(update.targetIds.itemId, "9007199254740993");
});

test("group plans reject missing or incomplete required fields locally", () => {
  assert.throws(() => normalizeItemGroupCreatePlan({ spaceId: 1, boardId: 2, body: { title: "Backlog" } }), /body.color/);
  assert.throws(() => normalizeItemGroupUpdatePlan({
    spaceId: 1,
    boardId: 2,
    itemGroupId: 3,
    body: { title: "Backlog", ranking: "m" },
  }), /body.color/);
});

test("base64 upload plans hash decoded bytes without retaining base64", async () => {
  const normalized = await normalizeBase64UploadPlan({
    spaceId: 1,
    boardId: 2,
    itemId: 3,
    upload: { fileBase64: "aGVsbG8=", fileName: "double..dot.txt", contentType: "text/plain; charset=utf-8" },
  });
  assert.equal(normalized.plan.upload?.decodedBytes, 5);
  assert.equal(normalized.plan.upload?.sha256, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  assert.equal("fileBase64" in normalized.plan.body, false);
});

test("plans expose stable typed validation failures", async () => {
  assert.throws(
    () => normalizeItemCreatePlan({ spaceId: 1, boardId: 2, body: { groupId: 3, groupTitle: "Backlog" } }),
    /cannot both be provided/,
  );
  await assert.rejects(
    normalizeBase64UploadPlan({ spaceId: 1, boardId: 2, itemId: 3, upload: { fileBase64: "aGVsbG8=", fileName: "bad/name" } }),
    (error) => error instanceof UploadValidationError && error.code === "invalid-filename" && error.path === "fileName",
  );
});
