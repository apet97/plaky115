#!/usr/bin/env node
// Opt-in live sweep against a sacrificial Plaky workspace.
//
//   PLAKY115_API_KEY=...                              required
//   PLAKY115_BASE_URL=https://api.plaky.com           optional
//   PLAKY115_SMOKE_SPACE_ID=165999                    sacrificial space id
//   PLAKY115_SMOKE_BOARD_ID=192510                    sacrificial board id
//   PLAKY115_SMOKE_GROUP_TITLE=Backlog                writable group on the board
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

const root = fileURLToPath(new URL("..", import.meta.url));
const apiKey = process.env["PLAKY115_API_KEY"] ?? process.env["PLAKY115_API_KEY_AUTH"];
const baseURL = process.env["PLAKY115_BASE_URL"] ?? "https://api.plaky.com";
const spaceId = String(process.env["PLAKY115_SMOKE_SPACE_ID"] ?? "");
const boardId = String(process.env["PLAKY115_SMOKE_BOARD_ID"] ?? "");
const wantSDK = process.env["PLAKY115_LIVE_SDK"] !== "0";
const wantCLI = process.env["PLAKY115_LIVE_CLI"] !== "0";
const wantMCP = process.env["PLAKY115_LIVE_MCP"] !== "0";

const runMarker = createRunMarker(randomUUID());
const ledger = createArtifactLedger(runMarker);
const summary = [];

async function main() {
  if (!apiKey) {
    console.error("Set PLAKY115_API_KEY (or PLAKY115_API_KEY_AUTH) before running.");
    process.exitCode = 2;
    return;
  }
  process.on("SIGINT", () => {
    void shutdown(130);
  });
  process.on("SIGTERM", () => {
    void shutdown(143);
  });

  try {
    await directAPISweep();
    if (wantSDK) await sdkSweep();
    if (wantCLI) await cliSweep();
    if (wantMCP) await mcpSweep();
    await cleanup();
    printSummary();
  } catch (err) {
    let cleanupErr;
    try {
      await cleanup();
    } catch (cleanupFailure) {
      cleanupErr = cleanupFailure;
    }
    console.error("live sweep failed:", redact(String(err && err.stack ? err.stack : err)));
    if (cleanupErr) {
      console.error("live sweep cleanup failed:", redact(String(cleanupErr && cleanupErr.stack ? cleanupErr.stack : cleanupErr)));
    }
    process.exitCode = 1;
  }
}

async function shutdown(code) {
  try {
    await cleanup();
  } catch (err) {
    console.error("live sweep cleanup failed:", redact(String(err && err.stack ? err.stack : err)));
  }
  process.exit(code);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

// ---------- helpers ----------

function smokeTitle(prefix) {
  return `${runMarker}${prefix}:${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function smokeText(prefix) {
  return `${runMarker}${prefix}`;
}

export function createRunMarker(uuid) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
    throw new TypeError("run identity must be a UUID");
  }
  return `smoke:plaky115:${uuid}:`;
}

export function createArtifactLedger(marker) {
  return { marker, groups: [], items: [], comments: [], files: [] };
}

export function trackArtifact(targetLedger, family, artifact) {
  if (!Object.hasOwn(targetLedger, family) || !Array.isArray(targetLedger[family])) {
    throw new TypeError(`unknown artifact family: ${family}`);
  }
  targetLedger[family].push({ ...artifact });
}

export function isOwnedArtifact(artifact, marker) {
  if (!artifact || typeof artifact !== "object") return false;
  return [artifact.title, artifact.name, artifact.description, artifact.content, artifact.text]
    .some((value) => typeof value === "string" && value.startsWith(marker));
}

export async function collectPages(fetchPage) {
  const records = [];
  for (let page = 1; ; page++) {
    const response = await fetchPage(page);
    records.push(...(Array.isArray(response?.data) ? response.data : []));
    if (response?.hasMore !== true) return records;
  }
}

export async function cleanupOwnedArtifacts({ ledger: targetLedger, adapters }) {
  const order = ["comments", "files", "items", "groups"];
  const failures = [];
  const discovered = { comments: 0, files: 0, items: 0, groups: 0 };
  const leftovers = { comments: 0, files: 0, items: 0, groups: 0 };

  async function attempt(family, artifact, stage) {
    try {
      await adapters[family].remove(artifact);
      const index = targetLedger[family].findIndex((entry) => String(entry.id) === String(artifact.id));
      if (index >= 0) targetLedger[family].splice(index, 1);
    } catch (error) {
      failures.push(new Error(`${stage} ${family} ${String(artifact.id ?? "unknown")} failed`, { cause: error }));
    }
  }

  for (const family of order) {
    for (const artifact of [...targetLedger[family]].reverse()) await attempt(family, artifact, "known cleanup");
  }

  for (const family of order) {
    let records = [];
    try {
      records = await adapters[family].list();
    } catch (error) {
      failures.push(new Error(`discovery scan ${family} failed`, { cause: error }));
      continue;
    }
    for (const artifact of records.filter((entry) => isOwnedArtifact(entry, targetLedger.marker))) {
      discovered[family]++;
      await attempt(family, artifact, "discovered cleanup");
    }
  }

  for (const family of order) {
    try {
      const records = await adapters[family].list();
      const owned = records.filter((entry) => isOwnedArtifact(entry, targetLedger.marker));
      leftovers[family] = owned.length;
      if (owned.length > 0) failures.push(new Error(`final rescan found ${owned.length} ${family}`));
    } catch (error) {
      failures.push(new Error(`final rescan ${family} failed`, { cause: error }));
    }
  }

  if (failures.length > 0) throw new AggregateError(failures, "live sweep cleanup failed");
  return { discovered, leftovers };
}

function redact(s) {
  return String(s).replace(/plk_[A-Za-z0-9_-]+/g, "[REDACTED_PLAKY_API_KEY]");
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

async function api(method, path, body) {
  const url = `${baseURL.replace(/\/$/, "")}${path}`;
  const headers = { "X-API-Key": apiKey, Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const resp = await fetch(url, init);
  const text = await resp.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
  if (!resp.ok) {
    throw new Error(`${method} ${path} -> ${resp.status}: ${redact(typeof parsed === "string" ? parsed : JSON.stringify(parsed))}`);
  }
  return parsed;
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
  }

  record("api", "listTeams", { count: (await api("GET", "/v1/public/teams?page=1&pageSize=5"))?.data?.length ?? 0 });
  record("api", "listUsers", { count: (await api("GET", "/v1/public/users?page=1&pageSize=5"))?.data?.length ?? 0 });
  record("api", "getCurrentUser", { email: maskedEmail((await api("GET", "/v1/public/users/me")).email) });
}

// ---------- 2. SDK sweep (PlakyClient) ----------

async function sdkSweep() {
  if (!spaceId || !boardId) {
    record("sdk", "skipped — needs PLAKY115_SMOKE_SPACE_ID and _BOARD_ID");
    return;
  }
  const built = ensureSDKBuilt();
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
  }

  record("sdk", "rateLimit.last", client.rateLimit.last);
}

// ---------- 3. CLI sweep ----------

async function cliSweep() {
  const bin = ensureCLIBuilt();
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
  record("cli", "comments-thread", runCLI(bin, ["comments-thread", "--space-id", spaceId, "--board-id", boardId, "--item-id", itemId], env, { jsonHead: true }));
  record("cli", "reactions-replace --dry-run", runCLI(bin, ["reactions-replace", "--space-id", spaceId, "--board-id", boardId, "--item-id", itemId, "--comment-id", "0", "--body", "{\"reactions\":[{\"value\":\"1f44d\"}]}", "--dry-run"], env));
}

// ---------- 4. MCP sweep ----------

async function mcpSweep() {
  const bin = `${root}mcp-server/bin/mcp-server.js`;
  if (!existsSync(bin)) {
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
  if (!ensureSDKBuilt()) {
    throw new Error("SDK build missing for MCP tool execution. Run `npm --prefix sdk run build` before live sweep.");
  }

  const { tools, ctx } = await createMcpHarness();

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
  await invokeMcpTool(tools, ctx, "plaky_get_space", { spaceId });
  record("mcp", "tool plaky_get_space");
  const boards = await invokeMcpTool(tools, ctx, "plaky_list_boards", { spaceId, pageSize: 5 });
  record("mcp", "tool plaky_list_boards", { count: boards?.data?.length ?? 0 });
  await invokeMcpTool(tools, ctx, "plaky_get_board", { spaceId, boardId });
  record("mcp", "tool plaky_get_board");
  const items = await invokeMcpTool(tools, ctx, "plaky_list_items", { spaceId, boardId, pageSize: 5 });
  record("mcp", "tool plaky_list_items", { count: items?.data?.length ?? 0 });

  const created = await invokeMcpTool(tools, ctx, "plaky_create_item", {
    spaceId,
    boardId,
    body: { title: smokeTitle("mcp-raw") },
  });
  const itemId = idOf(created);
  const itemTitle = created?.title ?? smokeTitle("mcp-raw");
  if (itemId) trackArtifact(ledger, "items", { id: String(itemId), title: itemTitle, surface: "mcp", operation: "plaky_create_item" });
  record("mcp", "tool plaky_create_item", { itemId });

  if (itemId) {
    await invokeMcpTool(tools, ctx, "plaky_get_item", { spaceId, boardId, itemId });
    record("mcp", "tool plaky_get_item");

    const content = smokeText("mcp-comment");
    const comment = await invokeMcpTool(tools, ctx, "plaky_create_item_comment", {
      spaceId,
      boardId,
      itemId,
      body: { text: content },
    });
    const commentId = idOf(comment);
    trackCreatedComment(itemId, commentId, "mcp", "plaky_create_item_comment", content);
    record("mcp", "tool plaky_create_item_comment", { commentId });

    const comments = await invokeMcpTool(tools, ctx, "plaky_list_item_comments", { spaceId, boardId, itemId });
    record("mcp", "tool plaky_list_item_comments", { count: comments?.data?.length ?? 0 });

    await invokeMcpTool(tools, ctx, "plaky_delete_item", { spaceId, boardId, itemId });
    forgetArtifact("items", itemId);
    forgetCreatedCommentsForItem(itemId);
    record("mcp", "tool plaky_delete_item", { itemId });
  }
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
  if (!value || typeof value !== "object" || typeof value.url !== "string") {
    throw new Error("Sensitive MCP output is missing its URL.");
  }
  const parsedURL = new URL(value.url);
  if (parsedURL.protocol !== "https:") {
    throw new Error("Sensitive MCP output URL must use HTTPS.");
  }
  if (typeof value.expiresInSeconds !== "number" || !Number.isFinite(value.expiresInSeconds)) {
    throw new Error("Sensitive MCP output is missing a finite expiry.");
  }
  return { urlPresent: true, expiresInSeconds: value.expiresInSeconds };
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
  const result = await cleanupOwnedArtifacts({ ledger, adapters: createCleanupAdapters() });
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
      remove: (artifact) => api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/item-groups/${artifact.id}`),
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
    console.error("go build failed:", redact(r.stderr));
    return null;
  }
  return bin;
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
  const grouped = {};
  for (const entry of summary) {
    grouped[entry.area] ??= [];
    grouped[entry.area].push(entry);
  }
  for (const area of Object.keys(grouped)) {
    console.log(`\n[${area}] ${grouped[area].length} entries`);
    for (const e of grouped[area]) {
      console.log("  -", e.name, JSON.stringify(e.detail));
    }
  }
  console.log(`\nlive sweep complete. run-owned artifacts cleaned up; tracked=${Object.values(ledger).filter(Array.isArray).reduce((count, entries) => count + entries.length, 0)}.`);
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
