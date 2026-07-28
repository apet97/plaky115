import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertBareFileList,
  assertVoidResult,
  createFixtureFormData,
  createTextFixture,
  summarizeDownloadLink,
} from "./live-workspace-sweep.mjs";
import { redact } from "./live/safe-output.mjs";

const liveSweep = ["live-workspace-sweep.mjs", "live/cleanup.mjs", "live/contracts.mjs", "live/mutation-budget.mjs", "live/safe-output.mjs"]
  .map((path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8"))
  .join("\n");
const liveWorkflow = readFileSync(fileURLToPath(new URL("../.github/workflows/live.yml", import.meta.url)), "utf8");
const corpus = JSON.parse(
  readFileSync(fileURLToPath(new URL("../test/fixtures/security/plaky-api-key-cases.json", import.meta.url)), "utf8"),
);

test("live sweep fails enabled SDK CLI and MCP sections instead of skipping missing builds", () => {
  assert.doesNotMatch(liveSweep, /record\("sdk", "skipped — sdk build missing/);
  assert.doesNotMatch(liveSweep, /record\("cli", "skipped — could not build CLI/);
  assert.doesNotMatch(liveSweep, /record\("mcp", "skipped — bin\/mcp-server\.js missing/);
  assert.match(liveSweep, /throw new Error\("SDK build missing/);
  assert.match(liveSweep, /throw new Error\("CLI build failed/);
  assert.match(liveSweep, /throw new Error\("MCP server bin missing/);
});

test("live sweep cleanup scans every family and fails after a final rescan", () => {
  assert.match(liveSweep, /const order = \["comments", "files", "items", "groups"\]/);
  assert.match(liveSweep, /discovery scan/);
  assert.match(liveSweep, /final rescan/);
  assert.match(liveSweep, /throw new AggregateError/);
  assert.match(liveSweep, /function listAllComments/);
  assert.match(liveSweep, /function listAllFiles/);
  assert.match(liveSweep, /function listAllItems/);
  assert.match(liveSweep, /function listAllGroups/);
  assert.match(liveSweep, /page=\$\{page\}&pageSize=200/);
});

test("live sweep fails when CLI probes fail and always rebuilds the CLI", () => {
  assert.doesNotMatch(liveSweep, /if \(existsSync\(bin\)\) return bin;/);
  assert.match(liveSweep, /throw new Error\(`CLI \$\{args\.join\(" "\)\} failed:/);
  assert.match(liveSweep, /throw new Error\("CLI workflow probes require a smoke item created by the API or SDK sweep"\)/);
  assert.match(liveSweep, /record\("cli", "comments-thread", runCLI/);
  assert.match(liveSweep, /record\("cli", "reactions-replace --dry-run", runCLI/);
});

test("live sweep reads structured MCP responses before text JSON fallback", () => {
  assert.match(liveSweep, /if \(response\.structuredContent\) return response\.structuredContent;/);
  assert.match(liveSweep, /Array\.isArray\(docs\?\.hits\) \? docs\.hits\.length : undefined/);
});

test("live sweep validates sensitive MCP output in memory and never records its URL", () => {
  assert.match(liveSweep, /if \(tool\.sensitiveOutput\)/);
  assert.match(liveSweep, /new URL\(value\.url\)/);
  assert.match(liveSweep, /urlPresent: true/);
  assert.match(liveSweep, /expiresInSeconds: value\.expiresInSeconds/);
  assert.doesNotMatch(liveSweep, /record\([^\n]*value\.url/);
  assert.doesNotMatch(liveSweep, /summary\.push\([^\n]*value\.url/);
});

test("live sweep redaction follows the shared split-literal corpus", () => {
  for (const entry of corpus.cases) {
    assert.equal(redact(entry.inputParts.join("")), entry.expectedParts.join(""), entry.name);
  }
});

test("live sweep uses one UUID-scoped marker and never broad smoke ownership", () => {
  assert.match(liveSweep, /randomUUID\(\)/);
  assert.match(liveSweep, /smoke:plaky115:\$\{uuid\}:/);
  assert.match(liveSweep, /createArtifactLedger\(runMarker\)/);
  assert.doesNotMatch(liveSweep, /startsWith\("smoke:"\)/);
});

test("live workflow serializes runs per target without cancelling cleanup", () => {
  assert.match(liveWorkflow, /concurrency:/);
  assert.match(liveWorkflow, /space_id/);
  assert.match(liveWorkflow, /board_id/);
  assert.match(liveWorkflow, /cancel-in-progress:\s*false/);
  assert.match(liveWorkflow, /allow_archive/);
  assert.match(liveWorkflow, /PLAKY115_SMOKE_ALLOW_ARCHIVE/);
  assert.doesNotMatch(liveWorkflow, /upload-artifact|raw response|response bod(?:y|ies)/i);
});

test("live sweep completes strict preflight before registering mutation sections", () => {
  const preflight = liveSweep.indexOf("await preflightLiveSweep");
  assert.ok(preflight >= 0);
  for (const mutation of ["await directAPISweep()", "await sdkSweep()", "await cliSweep()", "await mcpSweep()"]) {
    assert.ok(liveSweep.indexOf(mutation) > preflight, `${mutation} must follow preflight`);
  }
  assert.match(liveSweep, /createCleanupCoordinator/);
  assert.match(liveSweep, /createShutdownCoordinator/);
  assert.doesNotMatch(liveSweep, /console\.(?:log|error)\([^\n]*(?:err\.stack|JSON\.stringify\(parsed\)|r\.stderr)/);
});

test("live sweep covers item groups and item files on every surface", () => {
  for (const surface of ["api", "sdk", "cli", "mcp"]) {
    for (const operation of ["list", "get", "create", "update", "archive", "delete"]) {
      assert.match(liveSweep, new RegExp(`record\\(\"${surface}\", \"itemGroups\\.${operation}`));
    }
    for (const operation of ["upload", "list", "get", "download", "update", "delete"]) {
      assert.match(liveSweep, new RegExp(`record\\(\"${surface}\", \"itemFiles\\.${operation}`));
    }
  }
  assert.match(liveSweep, /PLAKY115_SMOKE_ALLOW_ARCHIVE/);
  assert.match(liveSweep, /FormData/);
  assert.match(liveSweep, /fileBase64/);
  assert.match(liveSweep, /--file", "-"/);
});

test("archive probes create groups with the live-required color and ranking", () => {
  assert.match(
    liveSweep,
    /archiveGroup = await api\("POST", path, \{ title: archiveTitle, color: "#3366FF", ranking: "0\|hzzzzz:" \}\)/,
  );
  assert.match(
    liveSweep,
    /archiveGroup = await client\.itemGroups\.create\(\{ \.\.\.scope, body: \{ title: archiveTitle, color: "#3366FF", ranking: "0\|hzzzzz:" \} \}\)/,
  );
  assert.match(
    liveSweep,
    /"item-groups-create", \.\.\.base, "--title", archiveTitle, "--color", "#3366FF", "--ranking", "0\|hzzzzz:"/,
  );
  assert.match(
    liveSweep,
    /"plaky_create_item_group", \{ \.\.\.scope, body: \{ title: archiveTitle, color: "#3366FF", ranking: "0\|hzzzzz:" \} \}/,
  );
});

test("CLI raw deletes request machine-readable void receipts", () => {
  const deletes = liveSweep.match(/\["raw", "delete-item-group", \.\.\.base,[^\n]+"--confirm", "--json"\]/g) ?? [];
  assert.equal(deletes.length, 2);
  assert.match(
    liveSweep,
    /\["raw", "delete-item-file", \.\.\.base,[^\n]+"--confirm", "--json"\]/,
  );
});

test("live sweep helpers enforce multipart, void, array, and sensitive-output contracts", () => {
  const fixture = createTextFixture("smoke:plaky115:00000000-0000-4000-8000-000000000000:", "mock");
  assert.equal(fixture.contentType, "text/plain");
  assert.equal(new TextDecoder().decode(fixture.bytes), "live fixture for mock");
  assert.ok(fixture.fileName.startsWith("smoke:plaky115:"));
  const multipart = createFixtureFormData(fixture);
  const part = multipart.get("file");
  assert.ok(part instanceof Blob);
  assert.equal(part.name, fixture.fileName);
  assert.equal(part.type, fixture.contentType);
  assert.equal(part.size, fixture.bytes.byteLength);

  assert.deepEqual(assertBareFileList([], "mock list"), []);
  assert.throws(() => assertBareFileList({ data: [] }, "mock list"), /bare array/);
  assert.equal(assertVoidResult(undefined, "mock delete"), undefined);
  assert.throws(() => assertVoidResult({ ok: true }, "mock delete"), /void response/);

  assert.deepEqual(
    summarizeDownloadLink({ url: "https://download.example.invalid/signed", expiresInSeconds: 60 }),
    { urlPresent: true, expiresInSeconds: 60 },
  );
  assert.throws(() => summarizeDownloadLink({ url: "", expiresInSeconds: 60 }), /non-empty HTTPS URL/);
  assert.throws(() => summarizeDownloadLink({ url: "https://example.invalid", expiresInSeconds: "60" }), /finite numeric expiry/);
});

test("live sweep never records download URLs or in-memory file contents", () => {
  assert.doesNotMatch(liveSweep, /record\([^\n]*(?:download\.url|fixture\.bytes|fileBase64)/);
  assert.doesNotMatch(liveSweep, /summary\.push\([^\n]*(?:download\.url|fixture\.bytes|fileBase64)/);
});
