#!/usr/bin/env node
// Opt-in live sweep against a sacrificial Plaky workspace.
//
//   PLAKY115_API_KEY=...                              required
//   PLAKY115_BASE_URL=https://api.plaky.com           optional
//   PLAKY115_SMOKE_SPACE_ID=165999                    sacrificial space id
//   PLAKY115_SMOKE_BOARD_ID=192510                    sacrificial board id
//   PLAKY115_SMOKE_GROUP_TITLE=Backlog                writable group on the board
//   PLAKY115_SMOKE_ALLOW_ARCHIVE=1                    acknowledge archive/delete probes
//   PLAKY115_LIVE_SDK=1                               enable SDK sweep (on by default)
//   PLAKY115_LIVE_CLI=1                               enable CLI sweep (on by default)
//   PLAKY115_LIVE_MCP=1                               enable MCP sweep (on by default)
//
// The key is never echoed, logged, or written to disk. Every test-created
// artifact carries one exact UUID-scoped marker and is cleaned up on exit.

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  attemptMutationOnce, createArtifactLedger, createMutationAttemptLedger, createRunMarker, trackArtifact,
} from "./live/mutation-budget.mjs";
import {
  cleanupOwnedArtifacts, collectPages, createCleanupCoordinator, createShutdownCoordinator,
  executeWithCleanup, isOwnedArtifact, verifyDeleteOutcome, waitForAbsent,
} from "./live/cleanup.mjs";
import { redact, serializeLiveFailure, serializeLiveSummary } from "./live/safe-output.mjs";
import {
  assertBareFileList, assertVoidResult, createFixtureFormData, createTextFixture,
  normalizePlakyBaseURL, preflightLiveSweep, summarizeDownloadLink,
} from "./live/contracts.mjs";

export {
  attemptMutationOnce, cleanupOwnedArtifacts, collectPages, createArtifactLedger, createCleanupCoordinator,
  createMutationAttemptLedger, createRunMarker, createShutdownCoordinator, executeWithCleanup,
  isOwnedArtifact, serializeLiveFailure, serializeLiveSummary, trackArtifact, verifyDeleteOutcome, waitForAbsent,
  assertBareFileList, assertVoidResult, createFixtureFormData, createTextFixture,
  normalizePlakyBaseURL, preflightLiveSweep, summarizeDownloadLink,
};

const root = fileURLToPath(new URL("..", import.meta.url));
const apiKey = process.env["PLAKY115_API_KEY"] ?? process.env["PLAKY115_API_KEY_AUTH"];
const baseURL = normalizePlakyBaseURL(process.env["PLAKY115_BASE_URL"] ?? "https://api.plaky.com");
const spaceId = String(process.env["PLAKY115_SMOKE_SPACE_ID"] ?? "");
const boardId = String(process.env["PLAKY115_SMOKE_BOARD_ID"] ?? "");
const wantSDK = process.env["PLAKY115_LIVE_SDK"] !== "0";
const wantCLI = process.env["PLAKY115_LIVE_CLI"] !== "0";
const wantMCP = process.env["PLAKY115_LIVE_MCP"] !== "0";
const allowArchive = process.env["PLAKY115_SMOKE_ALLOW_ARCHIVE"] === "1";

const runMarker = createRunMarker(randomUUID());
const ledger = createArtifactLedger(runMarker);
const attemptedMutations = createMutationAttemptLedger();
const summary = [];
let liveBuilds = {};
const cleanupOnce = createCleanupCoordinator(cleanup);
const shutdownOnce = createShutdownCoordinator({
  cleanup: cleanupOnce,
  exit: (code) => process.exit(code),
  onError: (error) => console.error(serializeLiveFailure(error)),
});

async function main() {
  try {
    liveBuilds = await preflightLiveSweep({
      apiKey,
      spaceId,
      boardId,
      allowArchive,
      wantSDK,
      wantCLI,
      wantMCP,
      checks: {
        sdk: ensureSDKBuilt,
        cli: ensureCLIBuilt,
        mcp: ensureMCPBuilt,
      },
    });
  } catch (error) {
    console.error(serializeLiveFailure(error));
    process.exitCode = 2;
    return;
  }
  process.on("SIGINT", () => {
    void shutdownOnce(130);
  });
  process.on("SIGTERM", () => {
    void shutdownOnce(143);
  });

  try {
    await executeWithCleanup(async () => {
      await directAPISweep();
      if (wantSDK) await sdkSweep();
      if (wantCLI) await cliSweep();
      if (wantMCP) await mcpSweep();
    }, cleanupOnce);
    printSummary();
  } catch (err) {
    console.error(serializeLiveFailure(err));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

// ---------- helpers ----------

function smokeTitle(prefix) {
  return `${runMarker}${prefix}:${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function smokeText(prefix) {
  return `${runMarker}${prefix}`;
}

function record(area, name, detail = {}) {
  summary.push({ area, name, detail });
}

function trackCreatedComment(itemId, commentId, surface, operation, content) {
  if (itemId && commentId) {
    trackArtifact(ledger, "comments", { itemId: String(itemId), id: String(commentId), surface, operation, content });
  }
}

function forgetCreatedCommentsForItem(itemId) {
  for (let i = ledger.comments.length - 1; i >= 0; i--) {
    if (String(ledger.comments[i].itemId) === String(itemId)) ledger.comments.splice(i, 1);
  }
}

function forgetArtifact(family, id) {
  const index = ledger[family].findIndex((artifact) => String(artifact.id) === String(id));
  if (index >= 0) ledger[family].splice(index, 1);
}

async function api(method, path, body, options = {}) {
  const url = `${baseURL.replace(/\/$/, "")}${path}`;
  const headers = { "X-API-Key": apiKey, Accept: "application/json" };
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";
  const init = { method, headers, redirect: "error" };
  if (body !== undefined) init.body = multipart ? body : JSON.stringify(body);
  const resp = await fetch(url, init);
  const text = await resp.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
  if (!resp.ok) {
    const error = new Error(`${method} ${path} failed with HTTP ${resp.status}`);
    error.status = resp.status;
    throw error;
  }
  if (options.responseType === "void") {
    if (text.trim() !== "") throw new Error(`${method} ${path} returned a body for a void operation`);
    return undefined;
  }
  return parsed;
}

async function deleteItemGroupWithVerification(itemGroupId, remove) {
  return verifyDeleteOutcome(remove, () => waitForAbsent(() => itemGroupIsAbsent(itemGroupId)));
}

async function deleteTrackedItemGroupWithVerification(itemGroupId, remove) {
  return attemptMutationOnce(
    attemptedMutations,
    "groups",
    itemGroupId,
    () => deleteItemGroupWithVerification(itemGroupId, remove),
  );
}

async function itemGroupIsAbsent(itemGroupId) {
  const path = `/v1/public/spaces/${spaceId}/boards/${boardId}/item-groups/${itemGroupId}`;
  const response = await fetch(`${baseURL.replace(/\/$/, "")}${path}`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    redirect: "error",
  });
  await response.arrayBuffer();
  if (response.status === 404) return true;
  if (!response.ok) {
    const error = new Error(`GET item group state failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return false;
}

// ---------- 1. direct API sweep ----------

async function directAPISweep() {
  if (!spaceId || !boardId) {
    record("api", "skipped — set PLAKY115_SMOKE_SPACE_ID and _BOARD_ID");
    return;
  }
  record("api", "listSpaces", { count: (await api("GET", "/v1/public/spaces?page=1&pageSize=20"))?.data?.length ?? 0 });
  record("api", "getSpace");
  await api("GET", `/v1/public/spaces/${spaceId}?expand=board`);
  record("api", "listBoards");
  await api("GET", `/v1/public/spaces/${spaceId}/boards?page=1&pageSize=20`);
  record("api", "getBoard");
  await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}`);
  const items = await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items?page=1&pageSize=10`);
  record("api", "listItems", { count: items?.data?.length ?? 0, hasMore: items?.hasMore === true });

  const tag = smokeTitle("api");
  const created = await api("POST", `/v1/public/spaces/${spaceId}/boards/${boardId}/items`, { title: tag });
  const newId = idOf(created);
  if (newId) trackArtifact(ledger, "items", { id: String(newId), title: tag, surface: "api", operation: "createItem" });
  record("api", "createItem", { itemId: newId });

  if (newId) {
    await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${newId}`);
    record("api", "getItem");
    const content = smokeText("api-comment");
    const comment = await api("POST", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${newId}/comments`, { text: content });
    const cId = idOf(comment);
    trackCreatedComment(newId, cId, "api", "createItemComment", content);
    record("api", "createItemComment", { commentId: cId });
    await directAPIItemFileSweep(newId);
  }

  await directAPIItemGroupSweep();

  record("api", "listTeams", { count: (await api("GET", "/v1/public/teams?page=1&pageSize=5"))?.data?.length ?? 0 });
  record("api", "listUsers", { count: (await api("GET", "/v1/public/users?page=1&pageSize=5"))?.data?.length ?? 0 });
  record("api", "getCurrentUser", { email: maskedEmail((await api("GET", "/v1/public/users/me")).email) });
}

async function directAPIItemGroupSweep() {
  const path = `/v1/public/spaces/${spaceId}/boards/${boardId}/item-groups`;
  const listed = await api("GET", `${path}?page=1&pageSize=200`);
  record("api", "itemGroups.list", { count: listed?.data?.length ?? 0 });

  const title = smokeTitle("api-group");
  const created = await api("POST", path, { title, color: "#3366FF", ranking: "0|hzzzzz:" });
  const groupId = idOf(created);
  if (!groupId) throw new Error("api item group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(groupId), title, surface: "api", operation: "itemGroups.create" });
  record("api", "itemGroups.create", { itemGroupId: groupId });

  const current = await api("GET", `${path}/${groupId}`);
  record("api", "itemGroups.get", { itemGroupId: groupId });
  await api("PUT", `${path}/${groupId}`, {
    title: smokeTitle("api-group-updated"),
    color: current?.color ?? "#3366FF",
    ranking: current?.ranking ?? "0|hzzzzz:",
  });
  record("api", "itemGroups.update", { itemGroupId: groupId });
  await deleteTrackedItemGroupWithVerification(groupId, async () => {
    assertVoidResult(await api("DELETE", `${path}/${groupId}`, undefined, { responseType: "void" }), "api item group delete");
  });
  forgetArtifact("groups", groupId);
  record("api", "itemGroups.delete", { itemGroupId: groupId });

  const archiveTitle = smokeTitle("api-group-archive");
  const archiveGroup = await api("POST", path, { title: archiveTitle, color: "#3366FF", ranking: "0|hzzzzz:" });
  const archiveId = idOf(archiveGroup);
  if (!archiveId) throw new Error("api archive-group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(archiveId), title: archiveTitle, surface: "api", operation: "itemGroups.archive" });
  assertVoidResult(await api("PUT", `${path}/${archiveId}/archive`, undefined, { responseType: "void" }), "api item group archive");
  record("api", "itemGroups.archive", { itemGroupId: archiveId });
  try {
    await deleteTrackedItemGroupWithVerification(archiveId, async () => {
      assertVoidResult(await api("DELETE", `${path}/${archiveId}`, undefined, { responseType: "void" }), "api archived item group delete");
    });
    forgetArtifact("groups", archiveId);
  } catch (error) {
    throw archivedGroupDeletionError(archiveId, error);
  }
}

async function directAPIItemFileSweep(itemId) {
  const path = `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${itemId}/files`;
  const fixture = createTextFixture(runMarker, "api");
  const uploaded = await api("POST", path, createFixtureFormData(fixture));
  const itemFileId = idOf(uploaded);
  if (!itemFileId) throw new Error("api item file upload response is missing an ID");
  trackArtifact(ledger, "files", { itemId: String(itemId), id: String(itemFileId), name: fixture.fileName, surface: "api", operation: "itemFiles.upload" });
  record("api", "itemFiles.upload", { itemFileId });

  const files = assertBareFileList(await api("GET", path), "api itemFiles.list");
  record("api", "itemFiles.list", { count: files.length });
  await api("GET", `${path}/${itemFileId}`);
  record("api", "itemFiles.get", { itemFileId });
  const download = await api("GET", `${path}/${itemFileId}/download`);
  record("api", "itemFiles.download", summarizeDownloadLink(download));
  await api("PUT", `${path}/${itemFileId}`, {
    name: `${runMarker}updated-api.txt`,
    description: smokeText("api-file-description"),
  });
  record("api", "itemFiles.update", { itemFileId });
  await attemptMutationOnce(attemptedMutations, "files", itemFileId, async () => {
    assertVoidResult(await api("DELETE", `${path}/${itemFileId}`, undefined, { responseType: "void" }), "api item file delete");
  });
  forgetArtifact("files", itemFileId);
  record("api", "itemFiles.delete", { itemFileId });
}

// ---------- 2. SDK sweep (PlakyClient) ----------

async function sdkSweep() {
  if (!spaceId || !boardId) {
    record("sdk", "skipped — needs PLAKY115_SMOKE_SPACE_ID and _BOARD_ID");
    return;
  }
  const built = liveBuilds.sdkBuilt;
  if (!built) {
    throw new Error("SDK build missing. Run `npm --prefix sdk run build` before live sweep.");
  }
  const { PlakyClient, SpaceId, BoardId, ItemId } = await import(`${root}sdk/esm/index.js`);
  const client = new PlakyClient({ apiKey, serverURL: baseURL });

  const spaces = await client.spaces.list({ page: 1, pageSize: 10 });
  record("sdk", "client.spaces.list", { count: spaces?.data?.length ?? 0 });

  await client.spaces.get(SpaceId(spaceId));
  record("sdk", "client.spaces.get");

  const boards = await client.boards.listAll({ spaceId: SpaceId(spaceId) });
  record("sdk", "client.boards.listAll", { count: boards.length });

  let iterCount = 0;
  for await (const _it of client.items.iterate({ spaceId: SpaceId(spaceId), boardId: BoardId(boardId), pageSize: 5, limit: 5 })) {
    iterCount++;
  }
  record("sdk", "client.items.iterate(limit=5)", { yielded: iterCount });

  const tag = smokeTitle("sdk");
  const created = await client.items.create({ spaceId: SpaceId(spaceId), boardId: BoardId(boardId), body: { title: tag } });
  const newId = idOf(created);
  if (newId) trackArtifact(ledger, "items", { id: String(newId), title: tag, surface: "sdk", operation: "items.create" });
  record("sdk", "client.items.create", { itemId: newId });

  if (newId) {
    const content = smokeText("sdk-comment");
    const comment = await client.comments.create({
      spaceId: SpaceId(spaceId),
      boardId: BoardId(boardId),
      itemId: ItemId(newId),
      body: { text: content },
    });
    const cId = idOf(comment);
    trackCreatedComment(newId, cId, "sdk", "comments.create", content);
    record("sdk", "client.comments.create", { commentId: cId });
    await sdkItemFileSweep(client, { SpaceId, BoardId, ItemId }, newId);
  }

  await sdkItemGroupSweep(client, { SpaceId, BoardId });

  record("sdk", "rateLimit.last", client.rateLimit.last);
}

async function sdkItemGroupSweep(client, ids) {
  const scope = { spaceId: ids.SpaceId(spaceId), boardId: ids.BoardId(boardId) };
  const listed = await client.itemGroups.list({ ...scope, page: 1, pageSize: 200 });
  record("sdk", "itemGroups.list", { count: listed?.data?.length ?? 0 });

  const title = smokeTitle("sdk-group");
  const created = await client.itemGroups.create({ ...scope, body: { title, color: "#3366FF", ranking: "0|hzzzzz:" } });
  const groupId = idOf(created);
  if (!groupId) throw new Error("sdk item group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(groupId), title, surface: "sdk", operation: "itemGroups.create" });
  record("sdk", "itemGroups.create", { itemGroupId: groupId });
  const current = await client.itemGroups.get({ ...scope, itemGroupId: groupId });
  record("sdk", "itemGroups.get", { itemGroupId: groupId });
  await client.itemGroups.update({
    ...scope,
    itemGroupId: groupId,
    body: {
      title: smokeTitle("sdk-group-updated"),
      color: current.color ?? "#3366FF",
      ranking: current.ranking ?? "0|hzzzzz:",
    },
  });
  record("sdk", "itemGroups.update", { itemGroupId: groupId });
  await deleteTrackedItemGroupWithVerification(groupId, async () => {
    assertVoidResult(await client.itemGroups.delete({ ...scope, itemGroupId: groupId }), "sdk item group delete");
  });
  forgetArtifact("groups", groupId);
  record("sdk", "itemGroups.delete", { itemGroupId: groupId });

  const archiveTitle = smokeTitle("sdk-group-archive");
  const archiveGroup = await client.itemGroups.create({ ...scope, body: { title: archiveTitle, color: "#3366FF", ranking: "0|hzzzzz:" } });
  const archiveId = idOf(archiveGroup);
  if (!archiveId) throw new Error("sdk archive-group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(archiveId), title: archiveTitle, surface: "sdk", operation: "itemGroups.archive" });
  assertVoidResult(await client.itemGroups.archive({ ...scope, itemGroupId: archiveId }), "sdk item group archive");
  record("sdk", "itemGroups.archive", { itemGroupId: archiveId });
  try {
    await deleteTrackedItemGroupWithVerification(archiveId, async () => {
      assertVoidResult(await client.itemGroups.delete({ ...scope, itemGroupId: archiveId }), "sdk archived item group delete");
    });
    forgetArtifact("groups", archiveId);
  } catch (error) {
    throw archivedGroupDeletionError(archiveId, error);
  }
}

async function sdkItemFileSweep(client, ids, itemId) {
  const scope = { spaceId: ids.SpaceId(spaceId), boardId: ids.BoardId(boardId), itemId: ids.ItemId(itemId) };
  const fixture = createTextFixture(runMarker, "sdk");
  const uploaded = await client.itemFiles.upload({
    ...scope,
    file: new Blob([fixture.bytes], { type: fixture.contentType }),
    fileName: fixture.fileName,
  });
  const itemFileId = idOf(uploaded);
  if (!itemFileId) throw new Error("sdk item file upload response is missing an ID");
  trackArtifact(ledger, "files", { itemId: String(itemId), id: String(itemFileId), name: fixture.fileName, surface: "sdk", operation: "itemFiles.upload" });
  record("sdk", "itemFiles.upload", { itemFileId });
  const files = assertBareFileList(await client.itemFiles.list(scope), "sdk itemFiles.list");
  record("sdk", "itemFiles.list", { count: files.length });
  await client.itemFiles.get({ ...scope, itemFileId });
  record("sdk", "itemFiles.get", { itemFileId });
  const download = await client.itemFiles.getDownload({ ...scope, itemFileId });
  record("sdk", "itemFiles.download", summarizeDownloadLink(download));
  await client.itemFiles.update({
    ...scope,
    itemFileId,
    body: { name: `${runMarker}updated-sdk.txt`, description: smokeText("sdk-file-description") },
  });
  record("sdk", "itemFiles.update", { itemFileId });
  await attemptMutationOnce(attemptedMutations, "files", itemFileId, async () => {
    assertVoidResult(await client.itemFiles.delete({ ...scope, itemFileId }), "sdk item file delete");
  });
  forgetArtifact("files", itemFileId);
  record("sdk", "itemFiles.delete", { itemFileId });
}

// ---------- 3. CLI sweep ----------

async function cliSweep() {
  const bin = liveBuilds.cliBin;
  if (!bin) {
    throw new Error("CLI build failed. Run `cd cli && go build ./cmd/plaky115` before live sweep.");
  }
  if (!spaceId || !boardId) {
    record("cli", "skipped — needs PLAKY115_SMOKE_SPACE_ID and _BOARD_ID");
    return;
  }
  const env = { ...process.env, PLAKY115_API_KEY: apiKey };
  record("cli", "doctor", runCLI(bin, ["doctor"], env));
  record("cli", "raw list-spaces", runCLI(bin, ["raw", "list-spaces", "--page-size", "5"], env, { jsonHead: true }));
  record("cli", "raw list-boards", runCLI(bin, ["raw", "list-boards", "--space-id", spaceId, "--page-size", "5"], env, { jsonHead: true }));
  record("cli", "fields-list", runCLI(bin, ["fields-list", "--space-id", spaceId, "--board-id", boardId], env, { jsonHead: true }));
  record("cli", "items-create-simple --dry-run", runCLI(bin, ["items-create-simple", "--space-id", spaceId, "--board-id", boardId, "--title", smokeTitle("cli-dry"), "--dry-run"], env));
  record("cli", "items-bulk-update --dry-run", runCLIWithFile(bin, ["items-bulk-update", "--file", "{file}", "--dry-run"], env, JSON.stringify([{ spaceId, boardId, itemId: "0", body: { Status: "Done" } }])));
  const itemId = ledger.items[0]?.id;
  if (!itemId) {
    throw new Error("CLI workflow probes require a smoke item created by the API or SDK sweep");
  }
  await cliItemGroupSweep(bin, env);
  await cliItemFileSweep(bin, env, itemId);
  record("cli", "comments-thread", runCLI(bin, ["comments-thread", "--space-id", spaceId, "--board-id", boardId, "--item-id", itemId], env, { jsonHead: true }));
  record("cli", "reactions-replace --dry-run", runCLI(bin, ["reactions-replace", "--space-id", spaceId, "--board-id", boardId, "--item-id", itemId, "--comment-id", "0", "--body", "{\"reactions\":[{\"value\":\"1f44d\"}]}", "--dry-run"], env));
}

async function cliItemGroupSweep(bin, env) {
  const base = ["--space-id", spaceId, "--board-id", boardId];
  const listed = runCLIParsed(bin, ["item-groups-list", ...base], env);
  if (!Array.isArray(listed)) throw new Error("cli itemGroups.list must return an array");
  record("cli", "itemGroups.list", { count: listed.length });

  const title = smokeTitle("cli-group");
  const created = runCLIParsed(bin, ["item-groups-create", ...base, "--title", title, "--color", "#3366FF", "--ranking", "0|hzzzzz:"], env);
  const groupId = idOf(created);
  if (!groupId) throw new Error("cli item group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(groupId), title, surface: "cli", operation: "itemGroups.create" });
  record("cli", "itemGroups.create", { itemGroupId: groupId });
  const current = runCLIParsed(bin, ["raw", "get-item-group", ...base, "--item-group-id", String(groupId)], env);
  record("cli", "itemGroups.get", { itemGroupId: groupId });
  runCLIParsed(bin, [
    "raw", "update-item-group", ...base, "--item-group-id", String(groupId), "--body",
    JSON.stringify({
      title: smokeTitle("cli-group-updated"),
      color: current?.color ?? "#3366FF",
      ranking: current?.ranking ?? "0|hzzzzz:",
    }),
  ], env);
  record("cli", "itemGroups.update", { itemGroupId: groupId });
  await deleteTrackedItemGroupWithVerification(groupId, async () => {
    assertOkReceipt(runCLIParsed(bin, ["raw", "delete-item-group", ...base, "--item-group-id", String(groupId), "--confirm", "--json"], env), "cli item group delete");
  });
  forgetArtifact("groups", groupId);
  record("cli", "itemGroups.delete", { itemGroupId: groupId });

  const archiveTitle = smokeTitle("cli-group-archive");
  const archiveGroup = runCLIParsed(bin, ["item-groups-create", ...base, "--title", archiveTitle, "--color", "#3366FF", "--ranking", "0|hzzzzz:"], env);
  const archiveId = idOf(archiveGroup);
  if (!archiveId) throw new Error("cli archive-group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(archiveId), title: archiveTitle, surface: "cli", operation: "itemGroups.archive" });
  assertOkReceipt(runCLIParsed(bin, ["item-groups-archive", ...base, "--item-group-id", String(archiveId), "--confirm"], env), "cli item group archive");
  record("cli", "itemGroups.archive", { itemGroupId: archiveId });
  try {
    await deleteTrackedItemGroupWithVerification(archiveId, async () => {
      assertOkReceipt(runCLIParsed(bin, ["raw", "delete-item-group", ...base, "--item-group-id", String(archiveId), "--confirm", "--json"], env), "cli archived item group delete");
    });
    forgetArtifact("groups", archiveId);
  } catch (error) {
    throw archivedGroupDeletionError(archiveId, error);
  }
}

async function cliItemFileSweep(bin, env, itemId) {
  const base = ["--space-id", spaceId, "--board-id", boardId, "--item-id", String(itemId)];
  const fixture = createTextFixture(runMarker, "cli");
  const uploaded = runCLIParsed(bin, [
    "item-files-upload", ...base, "--file", "-", "--filename", fixture.fileName, "--content-type", fixture.contentType,
  ], env, { input: fixture.bytes });
  const itemFileId = idOf(uploaded);
  if (!itemFileId) throw new Error("cli item file upload response is missing an ID");
  trackArtifact(ledger, "files", { itemId: String(itemId), id: String(itemFileId), name: fixture.fileName, surface: "cli", operation: "itemFiles.upload" });
  record("cli", "itemFiles.upload", { itemFileId });
  const files = assertBareFileList(runCLIParsed(bin, ["item-files-list", ...base], env), "cli itemFiles.list");
  record("cli", "itemFiles.list", { count: files.length });
  runCLIParsed(bin, ["raw", "get-item-file", ...base, "--item-file-id", String(itemFileId)], env);
  record("cli", "itemFiles.get", { itemFileId });
  const download = runCLIParsed(bin, ["item-files-download-link", ...base, "--item-file-id", String(itemFileId)], env);
  record("cli", "itemFiles.download", summarizeDownloadLink(download));
  runCLIParsed(bin, [
    "raw", "update-item-file", ...base, "--item-file-id", String(itemFileId), "--body",
    JSON.stringify({ name: `${runMarker}updated-cli.txt`, description: smokeText("cli-file-description") }),
  ], env);
  record("cli", "itemFiles.update", { itemFileId });
  await attemptMutationOnce(attemptedMutations, "files", itemFileId, async () => {
    assertOkReceipt(runCLIParsed(bin, ["raw", "delete-item-file", ...base, "--item-file-id", String(itemFileId), "--confirm", "--json"], env), "cli item file delete");
  });
  forgetArtifact("files", itemFileId);
  record("cli", "itemFiles.delete", { itemFileId });
}

function assertOkReceipt(value, label) {
  if (!value || value.ok !== true) {
    const error = new Error(`${label} must return an ok receipt for a void operation`);
    const status = value?.error?.status ?? value?.status;
    if (Number.isInteger(status)) error.status = status;
    throw error;
  }
  return value;
}

function archivedGroupDeletionError(artifactId, cause) {
  const error = new Error("archived item group could not be deleted; stop before another live run", { cause });
  error.artifactId = artifactId;
  return error;
}

// ---------- 4. MCP sweep ----------

async function mcpSweep() {
  const bin = liveBuilds.mcpBin;
  if (!bin) {
    throw new Error("MCP server bin missing. Run `npm --prefix mcp-server run build` before live sweep.");
  }
  for (const mode of ["curated", "generated", "all"]) {
    const env = { ...process.env, PLAKY115_API_KEY: apiKey };
    const r = spawnSync("node", [bin, "--mode", mode, "--help"], { encoding: "utf8", env });
    record("mcp", `boot --mode ${mode} --help`, { status: r.status, stdoutLines: r.stdout.split("\n").length });
    if (r.status !== 0) {
      throw new Error(`mcp boot --mode ${mode} failed: ${redact((r.stderr ?? "").slice(0, 200))}`);
    }
  }

  if (!spaceId || !boardId) {
    record("mcp", "tool execution skipped — needs PLAKY115_SMOKE_SPACE_ID and _BOARD_ID");
    return;
  }
  if (!liveBuilds.sdkBuilt) {
    throw new Error("SDK build missing for MCP tool execution. Run `npm --prefix sdk run build` before live sweep.");
  }

  const { tools, ctx } = await createMcpHarness();
  const mcpSpaceId = Number(spaceId);
  const mcpBoardId = Number(boardId);

  const docs = await invokeMcpTool(tools, ctx, "plaky_search_docs", { query: "items", limit: 3 });
  record("mcp", "tool plaky_search_docs", { hits: Array.isArray(docs?.hits) ? docs.hits.length : undefined });

  const plan = await invokeMcpTool(tools, ctx, "plaky_plan_mutation", {
    workflowId: "items.create",
    input: { spaceId, boardId, body: { title: smokeTitle("mcp-plan") } },
  });
  record("mcp", "tool plaky_plan_mutation", { dryRun: plan?.dryRun === true });

  const searched = await invokeMcpTool(tools, ctx, "plaky_execute_workflow", {
    workflowId: "items.search",
    input: { space: spaceId, board: boardId, query: "smoke", limit: 5 },
  });
  record("mcp", "tool plaky_execute_workflow items.search", { count: searched?.data?.length ?? 0 });

  const spaces = await invokeMcpTool(tools, ctx, "plaky_list_spaces", { pageSize: 5 });
  record("mcp", "tool plaky_list_spaces", { count: spaces?.data?.length ?? 0 });
  await invokeMcpTool(tools, ctx, "plaky_get_space", { spaceId: mcpSpaceId });
  record("mcp", "tool plaky_get_space");
  const boards = await invokeMcpTool(tools, ctx, "plaky_list_boards", { spaceId: mcpSpaceId, pageSize: 5 });
  record("mcp", "tool plaky_list_boards", { count: boards?.data?.length ?? 0 });
  await invokeMcpTool(tools, ctx, "plaky_get_board", { spaceId: mcpSpaceId, boardId: mcpBoardId });
  record("mcp", "tool plaky_get_board");
  const items = await invokeMcpTool(tools, ctx, "plaky_list_items", { spaceId: mcpSpaceId, boardId: mcpBoardId, pageSize: 5 });
  record("mcp", "tool plaky_list_items", { count: items?.data?.length ?? 0 });

  await mcpItemGroupSweep(tools, ctx, mcpSpaceId, mcpBoardId);

  const created = await invokeMcpTool(tools, ctx, "plaky_create_item", {
    spaceId: mcpSpaceId,
    boardId: mcpBoardId,
    body: { title: smokeTitle("mcp-raw") },
  });
  const itemId = idOf(created);
  const itemTitle = created?.title ?? smokeTitle("mcp-raw");
  if (itemId) trackArtifact(ledger, "items", { id: String(itemId), title: itemTitle, surface: "mcp", operation: "plaky_create_item" });
  record("mcp", "tool plaky_create_item", { itemId });

  if (itemId) {
    await invokeMcpTool(tools, ctx, "plaky_get_item", { spaceId: mcpSpaceId, boardId: mcpBoardId, itemId });
    record("mcp", "tool plaky_get_item");

    const content = smokeText("mcp-comment");
    const comment = await invokeMcpTool(tools, ctx, "plaky_create_item_comment", {
      spaceId: mcpSpaceId,
      boardId: mcpBoardId,
      itemId,
      body: { text: content },
    });
    const commentId = idOf(comment);
    trackCreatedComment(itemId, commentId, "mcp", "plaky_create_item_comment", content);
    record("mcp", "tool plaky_create_item_comment", { commentId });

    const comments = await invokeMcpTool(tools, ctx, "plaky_list_item_comments", { spaceId: mcpSpaceId, boardId: mcpBoardId, itemId });
    record("mcp", "tool plaky_list_item_comments", { count: comments?.data?.length ?? 0 });

    await mcpItemFileSweep(tools, ctx, mcpSpaceId, mcpBoardId, itemId);

    await attemptMutationOnce(attemptedMutations, "items", itemId, () => (
      invokeMcpTool(tools, ctx, "plaky_delete_item", { spaceId: mcpSpaceId, boardId: mcpBoardId, itemId })
    ));
    forgetArtifact("items", itemId);
    forgetCreatedCommentsForItem(itemId);
    record("mcp", "tool plaky_delete_item", { itemId });
  }
}

async function mcpItemGroupSweep(tools, ctx, mcpSpaceId, mcpBoardId) {
  const scope = { spaceId: mcpSpaceId, boardId: mcpBoardId };
  const listed = await invokeMcpTool(tools, ctx, "plaky_list_item_groups", { ...scope, page: 1, pageSize: 200 });
  if (!listed || !Array.isArray(listed.data)) throw new Error("mcp itemGroups.list must return a structured data envelope");
  record("mcp", "itemGroups.list", { count: listed.data.length });

  const title = smokeTitle("mcp-group");
  const created = await invokeMcpTool(tools, ctx, "plaky_create_item_group", {
    ...scope,
    body: { title, color: "#3366FF", ranking: "0|hzzzzz:" },
  });
  const groupId = idOf(created);
  if (!groupId) throw new Error("mcp item group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(groupId), title, surface: "mcp", operation: "itemGroups.create" });
  record("mcp", "itemGroups.create", { itemGroupId: groupId });
  const current = await invokeMcpTool(tools, ctx, "plaky_get_item_group", { ...scope, itemGroupId: groupId });
  record("mcp", "itemGroups.get", { itemGroupId: groupId });
  await invokeMcpTool(tools, ctx, "plaky_update_item_group", {
    ...scope,
    itemGroupId: groupId,
    body: {
      title: smokeTitle("mcp-group-updated"),
      color: current?.color ?? "#3366FF",
      ranking: current?.ranking ?? "0|hzzzzz:",
    },
  });
  record("mcp", "itemGroups.update", { itemGroupId: groupId });
  await deleteTrackedItemGroupWithVerification(groupId, async () => {
    assertOkReceipt(await invokeMcpTool(tools, ctx, "plaky_delete_item_group", { ...scope, itemGroupId: groupId }), "mcp item group delete");
  });
  forgetArtifact("groups", groupId);
  record("mcp", "itemGroups.delete", { itemGroupId: groupId });

  const archiveTitle = smokeTitle("mcp-group-archive");
  const archiveGroup = await invokeMcpTool(tools, ctx, "plaky_create_item_group", { ...scope, body: { title: archiveTitle, color: "#3366FF", ranking: "0|hzzzzz:" } });
  const archiveId = idOf(archiveGroup);
  if (!archiveId) throw new Error("mcp archive-group create response is missing an ID");
  trackArtifact(ledger, "groups", { id: String(archiveId), title: archiveTitle, surface: "mcp", operation: "itemGroups.archive" });
  assertOkReceipt(await invokeMcpTool(tools, ctx, "plaky_archive_item_group", { ...scope, itemGroupId: archiveId }), "mcp item group archive");
  record("mcp", "itemGroups.archive", { itemGroupId: archiveId });
  try {
    await deleteTrackedItemGroupWithVerification(archiveId, async () => {
      assertOkReceipt(await invokeMcpTool(tools, ctx, "plaky_delete_item_group", { ...scope, itemGroupId: archiveId }), "mcp archived item group delete");
    });
    forgetArtifact("groups", archiveId);
  } catch (error) {
    throw archivedGroupDeletionError(archiveId, error);
  }
}

async function mcpItemFileSweep(tools, ctx, mcpSpaceId, mcpBoardId, itemId) {
  const scope = { spaceId: mcpSpaceId, boardId: mcpBoardId, itemId };
  const fixture = createTextFixture(runMarker, "mcp");
  const uploaded = await invokeMcpTool(tools, ctx, "plaky_upload_item_file", {
    ...scope,
    fileBase64: Buffer.from(fixture.bytes).toString("base64"),
    fileName: fixture.fileName,
    contentType: fixture.contentType,
  });
  const itemFileId = idOf(uploaded);
  if (!itemFileId) throw new Error("mcp item file upload response is missing an ID");
  trackArtifact(ledger, "files", { itemId: String(itemId), id: String(itemFileId), name: fixture.fileName, surface: "mcp", operation: "itemFiles.upload" });
  record("mcp", "itemFiles.upload", { itemFileId });
  const files = await invokeMcpTool(tools, ctx, "plaky_list_item_files", scope);
  if (!files || !Array.isArray(files.data)) throw new Error("mcp itemFiles.list must return a structured data envelope");
  record("mcp", "itemFiles.list", { count: files.data.length });
  await invokeMcpTool(tools, ctx, "plaky_get_item_file", { ...scope, itemFileId });
  record("mcp", "itemFiles.get", { itemFileId });
  const download = await invokeMcpTool(tools, ctx, "plaky_get_item_file_download", { ...scope, itemFileId });
  record("mcp", "itemFiles.download", summarizeDownloadLink(download));
  await invokeMcpTool(tools, ctx, "plaky_update_item_file", {
    ...scope,
    itemFileId,
    body: { name: `${runMarker}updated-mcp.txt`, description: smokeText("mcp-file-description") },
  });
  record("mcp", "itemFiles.update", { itemFileId });
  await attemptMutationOnce(attemptedMutations, "files", itemFileId, async () => {
    assertOkReceipt(await invokeMcpTool(tools, ctx, "plaky_delete_item_file", { ...scope, itemFileId }), "mcp item file delete");
  });
  forgetArtifact("files", itemFileId);
  record("mcp", "itemFiles.delete", { itemFileId });
}

async function createMcpHarness() {
  const [{ PlakyClient }, { compactByKind, serializeForMcp, structuredForMcp }, { curatedTools }, { rawTools }] = await Promise.all([
    import(`${root}sdk/esm/index.js`),
    import(`${root}mcp-server/esm/runtime/compaction.js`),
    import(`${root}mcp-server/esm/tools/curated/index.js`),
    import(`${root}mcp-server/esm/tools/raw/index.js`),
  ]);
  const client = new PlakyClient({ apiKey, serverURL: baseURL });
  const ctx = {
    client,
    requestOptions: client.requestOptions(),
    respond(value, ro) {
      const compacted = ro?.compactKind
        ? compactByKind(value, ro.compactKind, { includeRaw: ro.includeRaw === true })
        : value;
      const structuredContent = structuredForMcp(compacted);
      return {
        content: [{ type: "text", text: serializeForMcp(structuredContent) }],
        structuredContent,
      };
    },
    progress: () => {
      /* no-op for live sweep */
    },
  };
  return { tools: new Map([...curatedTools, ...rawTools].map((tool) => [tool.name, tool])), ctx };
}

async function invokeMcpTool(tools, ctx, name, input) {
  const tool = tools.get(name);
  if (!tool) throw new Error(`MCP tool not found: ${name}`);
  const result = await tool.handler(input, ctx);
  const response = isMcpResponse(result) ? result : ctx.respond(result);
  const value = parseMcpResponse(response);
  if (tool.sensitiveOutput) {
    record("mcp", `tool ${name} sensitive output`, summarizeSensitiveMcpOutput(value));
  }
  return value;
}

function summarizeSensitiveMcpOutput(value) {
  return summarizeDownloadLink(value);
}

function isMcpResponse(value) {
  return value && typeof value === "object" && Array.isArray(value.content);
}

function parseMcpResponse(response) {
  if (response.structuredContent) return response.structuredContent;
  const text = response.content?.[0]?.text ?? "";
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text;
  }
}

// ---------- cleanup ----------

async function cleanup() {
  if (!spaceId || !boardId) return;
  const result = await cleanupOwnedArtifacts({ ledger, adapters: createCleanupAdapters(), attempted: attemptedMutations });
  record("cleanup", "run-owned artifact cleanup", {
    discovered: result.discovered,
    leftovers: result.leftovers,
  });
}

function createCleanupAdapters() {
  return {
    comments: {
      list: listAllComments,
      remove: (artifact) => api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${artifact.itemId}/comments/${artifact.id}`),
    },
    files: {
      list: listAllFiles,
      remove: (artifact) => api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${artifact.itemId}/files/${artifact.id}`),
    },
    items: {
      list: listAllItems,
      remove: (artifact) => api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${artifact.id}`),
    },
    groups: {
      list: listAllGroups,
      remove: (artifact) => deleteItemGroupWithVerification(
        artifact.id,
        () => api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/item-groups/${artifact.id}`),
      ),
    },
  };
}

async function listAllItems() {
  return collectPages((page) => api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items?page=${page}&pageSize=200`));
}

async function listAllGroups() {
  return collectPages((page) => api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/item-groups?page=${page}&pageSize=200`));
}

async function listAllComments() {
  const out = [];
  for (const item of await listAllItems()) {
    const itemId = idOf(item);
    if (itemId === undefined) continue;
    const response = await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${itemId}/comments`);
    for (const comment of normalizeList(response)) out.push({ ...comment, itemId });
  }
  return out;
}

async function listAllFiles() {
  const out = [];
  for (const item of await listAllItems()) {
    const itemId = idOf(item);
    if (itemId === undefined) continue;
    const response = await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${itemId}/files`);
    for (const file of normalizeList(response)) out.push({ ...file, itemId });
  }
  return out;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.data) ? value.data : [];
}

// ---------- ensure binaries ----------

function ensureSDKBuilt() {
  const indexPath = `${root}sdk/esm/index.js`;
  return existsSync(indexPath);
}

function ensureCLIBuilt() {
  const bin = "/tmp/plaky115-live-sweep";
  rmSync(bin, { force: true });
  const r = spawnSync("go", ["build", "-o", bin, "./cmd/plaky115"], { cwd: `${root}cli`, encoding: "utf8" });
  if (r.status !== 0) {
    return null;
  }
  return bin;
}

function ensureMCPBuilt() {
  const bin = `${root}mcp-server/bin/mcp-server.js`;
  return existsSync(bin) ? bin : null;
}

function runCLI(bin, args, env, opts = {}) {
  const r = spawnSync(bin, args, { encoding: "utf8", env });
  if (r.status !== 0) {
    throw new Error(`CLI ${args.join(" ")} failed: ${redact((r.stderr ?? "").slice(0, 200))}`);
  }
  const stdout = r.stdout ?? "";
  if (opts.jsonHead) {
    try {
      const parsed = JSON.parse(stdout);
      const sample = Array.isArray(parsed) ? parsed.slice(0, 2) : Array.isArray(parsed?.data) ? parsed.data.slice(0, 2) : parsed;
      return { status: 0, sample };
    } catch {
      return { status: 0, stdoutHead: stdout.slice(0, 200) };
    }
  }
  return { status: 0, stdoutLen: stdout.length };
}

function runCLIParsed(bin, args, env, options = {}) {
  const r = spawnSync(bin, args, {
    encoding: "utf8",
    env,
    ...(options.input !== undefined ? { input: options.input } : {}),
  });
  if (r.status !== 0) {
    const stderr = r.stderr ?? "";
    const error = new Error(`CLI ${args.join(" ")} failed: ${redact(stderr.slice(0, 200))}`);
    const status = Number(/status=(\d{3})/.exec(stderr)?.[1]);
    if (Number.isInteger(status)) error.status = status;
    throw error;
  }
  try {
    return JSON.parse(r.stdout ?? "");
  } catch (error) {
    throw new Error(`CLI ${args.join(" ")} did not return JSON`, { cause: error });
  }
}

function runCLIWithFile(bin, args, env, fileContents) {
  const dir = mkdtempSync(join(tmpdir(), "plaky-sweep-"));
  const file = join(dir, "input.json");
  writeFileSync(file, fileContents);
  try {
    const expanded = args.map((a) => a.replace("{file}", file));
    return runCLI(bin, expanded, env);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- printers ----------

function printSummary() {
  const tracked = Object.values(ledger).filter(Array.isArray).reduce((count, entries) => count + entries.length, 0);
  console.log(serializeLiveSummary(summary, tracked));
}

function idOf(value) {
  if (value && typeof value === "object") {
    if ("id" in value && (typeof value.id === "string" || typeof value.id === "number")) return value.id;
    if ("data" in value) return idOf(value.data);
  }
  return undefined;
}

function maskedEmail(email) {
  if (typeof email !== "string" || !email.includes("@")) return undefined;
  const [user, host] = email.split("@");
  const head = user.slice(0, 1);
  return `${head}***@${host}`;
}
