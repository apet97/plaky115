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
// item / comment carries a "smoke:" prefix and is cleaned up on exit.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const apiKey = process.env["PLAKY115_API_KEY"] ?? process.env["PLAKY115_API_KEY_AUTH"];
if (!apiKey) {
  console.error("Set PLAKY115_API_KEY (or PLAKY115_API_KEY_AUTH) before running.");
  process.exit(2);
}

const baseURL = process.env["PLAKY115_BASE_URL"] ?? "https://api.plaky.com";
const spaceId = String(process.env["PLAKY115_SMOKE_SPACE_ID"] ?? "");
const boardId = String(process.env["PLAKY115_SMOKE_BOARD_ID"] ?? "");
const wantSDK = process.env["PLAKY115_LIVE_SDK"] !== "0";
const wantCLI = process.env["PLAKY115_LIVE_CLI"] !== "0";
const wantMCP = process.env["PLAKY115_LIVE_MCP"] !== "0";

const createdItemIds = new Set();
const createdCommentRefs = []; // { itemId, commentId }
const summary = [];

process.on("SIGINT", () => {
  void shutdown(130);
});
process.on("SIGTERM", () => {
  void shutdown(143);
});

async function shutdown(code) {
  try {
    await cleanup();
  } catch (err) {
    console.error("live sweep cleanup failed:", redact(String(err && err.stack ? err.stack : err)));
  }
  process.exit(code);
}

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
  } catch (err) {
    cleanupErr = err;
  }
  console.error("live sweep failed:", redact(String(err && err.stack ? err.stack : err)));
  if (cleanupErr) {
    console.error("live sweep cleanup failed:", redact(String(cleanupErr && cleanupErr.stack ? cleanupErr.stack : cleanupErr)));
  }
  process.exit(1);
}

// ---------- helpers ----------

function smokeTitle(prefix) {
  return `smoke:${prefix}:${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function redact(s) {
  return String(s).replace(/plk_[A-Za-z0-9_-]+/g, "plk_***");
}

function record(area, name, detail = {}) {
  summary.push({ area, name, detail });
}

function trackCreatedComment(itemId, commentId) {
  if (itemId && commentId) createdCommentRefs.push({ itemId: String(itemId), commentId: String(commentId) });
}

function forgetCreatedCommentsForItem(itemId) {
  for (let i = createdCommentRefs.length - 1; i >= 0; i--) {
    if (String(createdCommentRefs[i].itemId) === String(itemId)) createdCommentRefs.splice(i, 1);
  }
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
  if (newId) createdItemIds.add(String(newId));
  record("api", "createItem", { itemId: newId });

  if (newId) {
    await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${newId}`);
    record("api", "getItem");
    const comment = await api("POST", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${newId}/comments`, { text: "smoke comment" });
    const cId = idOf(comment);
    trackCreatedComment(newId, cId);
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
  if (newId) createdItemIds.add(String(newId));
  record("sdk", "client.items.create", { itemId: newId });

  if (newId) {
    const comment = await client.comments.create({
      spaceId: SpaceId(spaceId),
      boardId: BoardId(boardId),
      itemId: ItemId(newId),
      body: { text: "sdk-smoke" },
    });
    const cId = idOf(comment);
    trackCreatedComment(newId, cId);
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
  const itemId = [...createdItemIds][0];
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
  if (itemId) createdItemIds.add(String(itemId));
  record("mcp", "tool plaky_create_item", { itemId });

  if (itemId) {
    await invokeMcpTool(tools, ctx, "plaky_get_item", { spaceId, boardId, itemId });
    record("mcp", "tool plaky_get_item");

    const comment = await invokeMcpTool(tools, ctx, "plaky_create_item_comment", {
      spaceId,
      boardId,
      itemId,
      body: { text: "mcp-smoke" },
    });
    const commentId = idOf(comment);
    trackCreatedComment(itemId, commentId);
    record("mcp", "tool plaky_create_item_comment", { commentId });

    const comments = await invokeMcpTool(tools, ctx, "plaky_list_item_comments", { spaceId, boardId, itemId });
    record("mcp", "tool plaky_list_item_comments", { count: comments?.data?.length ?? 0 });

    await invokeMcpTool(tools, ctx, "plaky_delete_item", { spaceId, boardId, itemId });
    createdItemIds.delete(String(itemId));
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
  return parseMcpResponse(response);
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
  for (let i = createdCommentRefs.length - 1; i >= 0; i--) {
    const ref = createdCommentRefs[i];
    try {
      await api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${ref.itemId}/comments/${ref.commentId}`);
      createdCommentRefs.splice(i, 1);
    } catch (err) {
      record("cleanup", `comment ${ref.commentId} failed`, { error: redact(String(err.message ?? err)) });
    }
  }
  for (const itemId of [...createdItemIds]) {
    try {
      await api("DELETE", `/v1/public/spaces/${spaceId}/boards/${boardId}/items/${itemId}`);
      createdItemIds.delete(String(itemId));
      forgetCreatedCommentsForItem(itemId);
    } catch (err) {
      record("cleanup", `item ${itemId} failed`, { error: redact(String(err.message ?? err)) });
    }
  }
  const leftoverCount = await scanLeftovers();
  if (leftoverCount > 0) {
    throw new Error(`live sweep cleanup left ${leftoverCount} smoke item(s) in the sacrificial board`);
  }
}

async function scanLeftovers() {
  try {
    const leftovers = [];
    for (let page = 1; ; page++) {
      const items = await api("GET", `/v1/public/spaces/${spaceId}/boards/${boardId}/items?page=${page}&pageSize=200`);
      leftovers.push(...(items?.data ?? []).filter((it) => typeof it?.title === "string" && it.title.startsWith("smoke:")));
      if (!items?.hasMore) break;
    }
    record("cleanup", "leftover scan", { count: leftovers.length, ids: leftovers.map((it) => it.id) });
    return leftovers.length;
  } catch (err) {
    record("cleanup", "leftover scan failed", { error: redact(String(err.message ?? err)) });
    throw new Error(`live sweep cleanup leftover scan failed: ${redact(String(err.message ?? err))}`);
  }
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
  console.log(`\nlive sweep complete. items=${createdItemIds.size} comments=${createdCommentRefs.length} cleaned up.`);
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
