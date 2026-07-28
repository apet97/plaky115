import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReadOperations, runSurface } from "./live-read-sweep.mjs";

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
