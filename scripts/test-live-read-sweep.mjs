import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReadOperations, runSurface, validateSurfaceCoverage } from "./live-read-sweep.mjs";
import { parseLiveJSON, readBoundedLiveText } from "./live/http.mjs";

test("live response parsing preserves unsafe integer IDs and bounds streamed bodies", async () => {
  assert.deepEqual(
    parseLiveJSON('{"safe":9007199254740991,"large":9223372036854775807,"nested":[-9223372036854775808]}'),
    { safe: 9007199254740991, large: "9223372036854775807", nested: ["-9223372036854775808"] },
  );
  await assert.rejects(readBoundedLiveText(new Response("12345"), 4), /exceeds 4 bytes/);
});

test("read sweep covers all 17 documented GET operations and cannot construct writes", () => {
  const operations = buildReadOperations({ spaceId: "1", boardId: "2", itemGroupId: "3", itemId: "4", itemFileId: "5", teamId: "6" });
  assert.equal(operations.length, 17);
  assert.ok(operations.every((operation) => operation.method === "GET" && operation.path.startsWith("/v1/public/")));
  assert.ok(operations.every((operation) => !operation.path.includes("/workspaces/")));
});

test("signed download details and workspace data never enter emitted records", async () => {
  const output = [];
  const records = await runSurface("api", [{ operationId: "getItemFileDownload", method: "GET", path: "/v1/public/file/download", signed: true }], async () => ({
    status: 200,
    data: { url: "https://signed.invalid/secret", expiresInSeconds: 60, title: "private" },
  }), (line) => output.push(line));
  assert.equal(records[0].status, "PASS");
  assert.doesNotMatch(output.join("\n"), /signed|secret|private|url/i);
});

test("missing file prerequisites are explicit skips with zero calls", async () => {
  const operations = buildReadOperations({ spaceId: "1", boardId: "2", itemId: "3" }).filter((operation) => operation.operationId.startsWith("getItemFile"));
  let calls = 0;
  const records = await runSurface("sdk", operations, async () => { calls++; }, () => {});
  assert.equal(calls, 0);
  assert.ok(records.every((record) => record.status === "SKIP_PREREQUISITE"));
});

test("coverage accepts only complete success or the exact two file skips", () => {
  const pass = buildReadOperations({ spaceId: "1", boardId: "2", itemGroupId: "3", itemId: "4", itemFileId: "5", teamId: "6" })
    .map(({ operationId }) => ({ operationId, status: "PASS" }));
  assert.equal(validateSurfaceCoverage(pass).length, 17);

  const noFile = pass.map((record) => ["getItemFile", "getItemFileDownload"].includes(record.operationId)
    ? { ...record, status: "SKIP_PREREQUISITE" }
    : record);
  assert.equal(validateSurfaceCoverage(noFile).length, 17);
  assert.throws(() => validateSurfaceCoverage(noFile.map((record) => record.operationId === "getItem" ? { ...record, status: "SKIP_PREREQUISITE" } : record)), /skip only/);
  assert.throws(() => validateSurfaceCoverage(pass.slice(1)), /all 17/);
  assert.throws(() => validateSurfaceCoverage(pass.map((record, index) => index === 0 ? { ...record, status: "FAIL" } : record)), /failed/);
});

test("signed download metadata requires HTTPS and a finite expiry", async () => {
  for (const data of [
    { url: "http://signed.invalid/secret", expiresInSeconds: 60 },
    { url: "https://signed.invalid/secret" },
    { url: "https://signed.invalid/secret", expiresInSeconds: Number.NaN },
  ]) {
    const records = await runSurface("api", [{ operationId: "getItemFileDownload", method: "GET", path: "/v1/public/file/download", signed: true }], async () => ({ status: 200, data }), () => {});
    assert.equal(records[0].status, "FAIL");
  }
});
