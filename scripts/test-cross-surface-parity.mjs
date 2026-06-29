// Cross-surface parity test (F7).
//
// Drives all three Plaky115 surfaces — the TypeScript SDK (in-process), the MCP
// raw tools (in-process), and the Go CLI raw commands (subprocess) — against
// recording transports, then asserts that for every one of the 20 operations
// the three surfaces emit the SAME HTTP method, path, and query-parameter keys,
// and the SAME JSON body for writes. The operation metadata is the single
// source of truth the expectations are derived from; the SDK is hand-written
// (not generated from it), so this is the test that catches the SDK drifting
// from the generated CLI/MCP surfaces — e.g. the `expand` serialization (F4) or
// dropped raw params (F8).
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { execFile, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));

// Fixed inputs fed identically to every surface. Sentinel IDs need no escaping
// so all three surfaces produce byte-identical concrete paths.
const ID = {
  spaceId: "S1",
  boardId: "B1",
  itemId: "I1",
  itemCommentId: "C1",
  itemFieldKey: "F1",
  teamId: "T1",
};
const PAGE = 1;
const PAGE_SIZE = 2;
const EXPAND = "space,board";
const BODIES = {
  createItem: { title: "Parity" },
  updateItemField: { value: "x" },
  updateItemFields: { "string-1": "x" },
  createItemComment: { text: "hi" },
  updateItemComment: { text: "hi2" },
  replaceCommentReactions: { reactions: [{ value: "1f44d" }] },
};

// SDK invocation per operationId. The SDK method names do not map mechanically
// from operationIds, so this table is the explicit hand-written SDK contract.
const sdkInvokers = {
  listSpaces: (c) => c.spaces.list({ page: PAGE, pageSize: PAGE_SIZE, expand: ["space", "board"] }),
  listTeams: (c) => c.teams.list({ page: PAGE, pageSize: PAGE_SIZE }),
  listUsers: (c) => c.users.list({ page: PAGE, pageSize: PAGE_SIZE }),
  listBoards: (c) => c.boards.list({ spaceId: ID.spaceId, page: PAGE, pageSize: PAGE_SIZE }),
  listItems: (c) => c.items.list({ spaceId: ID.spaceId, boardId: ID.boardId, page: PAGE, pageSize: PAGE_SIZE, expand: ["space", "board"] }),
  createItem: (c) => c.items.create({ spaceId: ID.spaceId, boardId: ID.boardId, body: BODIES.createItem }),
  getSpace: (c) => c.spaces.get({ spaceId: ID.spaceId, expand: ["space", "board"] }),
  getTeam: (c) => c.teams.get(ID.teamId),
  getCurrentUser: (c) => c.users.me(),
  getBoard: (c) => c.boards.get({ spaceId: ID.spaceId, boardId: ID.boardId }),
  listSubitems: (c) => c.items.listSubitems({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, page: PAGE, pageSize: PAGE_SIZE, expand: ["space", "board"] }),
  getItem: (c) => c.items.get({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, expand: ["space", "board"] }),
  deleteItem: (c) => c.items.delete({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId }),
  updateItemField: (c) => c.items.updateField({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemFieldKey: ID.itemFieldKey, body: BODIES.updateItemField }),
  updateItemFields: (c) => c.items.updateFields({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, body: BODIES.updateItemFields }),
  listItemComments: (c) => c.comments.list({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId }),
  createItemComment: (c) => c.comments.create({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, body: BODIES.createItemComment }),
  updateItemComment: (c) => c.comments.update({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemCommentId: ID.itemCommentId, body: BODIES.updateItemComment }),
  deleteItemComment: (c) => c.comments.delete({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemCommentId: ID.itemCommentId }),
  replaceCommentReactions: (c) => c.reactions.replace({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemCommentId: ID.itemCommentId, body: BODIES.replaceCommentReactions }),
};

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function pathParamNames(path) {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

// Derive the metadata-driven shape of one operation: the inputs each surface is
// expected to send and the resulting concrete request.
function describeOperation(op) {
  const params = pathParamNames(op.path);
  const queryNames = (op.query ?? []).map((q) => q.name);
  const expectsExpand = queryNames.includes("expand");
  const expectsPage = Boolean(op.pagination);
  const isWrite = op.bodyRequired === true;
  const isDelete = op.method === "DELETE";

  const concretePath = op.path.replace(/\{([^}]+)\}/g, (_m, name) => {
    if (!(name in ID)) throw new Error(`no sentinel for path param ${name} in ${op.operationId}`);
    return ID[name];
  });

  const expectedQueryPairs = [];
  if (expectsPage) {
    expectedQueryPairs.push(`page=${PAGE}`, `pageSize=${PAGE_SIZE}`);
  }
  if (expectsExpand) {
    expectedQueryPairs.push(`expand=${EXPAND}`);
  }
  expectedQueryPairs.sort();

  // MCP input object (camelCase keys, as the generated zod schemas expect).
  const mcpInput = {};
  for (const name of params) mcpInput[name] = ID[name];
  if (expectsPage) {
    mcpInput.page = PAGE;
    mcpInput.pageSize = PAGE_SIZE;
  }
  if (expectsExpand) mcpInput.expand = EXPAND;
  if (isWrite) mcpInput.body = BODIES[op.operationId];

  // CLI flags (kebab-cased), as the generated cobra commands expect.
  const cliCmd = camelToKebab(op.operationId);
  const cliFlags = [];
  for (const name of params) cliFlags.push(`--${camelToKebab(name)}`, String(ID[name]));
  if (expectsPage) cliFlags.push("--page", String(PAGE), "--page-size", String(PAGE_SIZE));
  if (expectsExpand) cliFlags.push("--expand", EXPAND);
  if (isWrite) cliFlags.push("--body", JSON.stringify(BODIES[op.operationId]));
  if (isDelete) cliFlags.push("--confirm");

  return {
    operationId: op.operationId,
    mcpName: op.mcpName,
    method: op.method,
    concretePath,
    expectedQueryPairs,
    expectsExpand,
    isWrite,
    isDelete,
    mcpInput,
    cliCmd,
    cliFlags,
  };
}

// Parse a captured request URL (full or path-relative) into method-agnostic
// dimensions: pathname plus sorted `key=value` query pairs.
function dissect(captured) {
  const url = new URL(captured.url, "http://parity.local");
  const queryPairs = [...url.searchParams.entries()].map(([k, v]) => `${k}=${v}`).sort();
  return { method: captured.method, pathname: url.pathname, queryPairs, body: captured.body };
}

// A fetch implementation that records the outgoing request and returns a benign
// stub so the surface's response handling does not throw.
function recordingFetch(store) {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const method = (init && init.method) || (typeof input === "object" && input.method) || "GET";
    let body;
    const rawBody = init && init.body;
    if (rawBody !== undefined && rawBody !== null && rawBody !== "") {
      try {
        body = JSON.parse(typeof rawBody === "string" ? rawBody : String(rawBody));
      } catch {
        body = rawBody;
      }
    }
    store.push({ url, method, body });
    if (method === "DELETE") return new Response(null, { status: 204 });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
}

// Always rebuild the esm before importing it: validating a stale build against
// fresh metadata would be a false green. The gated path already rebuilds; this
// also makes standalone `node --test` runs trustworthy.
function ensureBuild(prefix) {
  execFileSync("npm", ["--prefix", prefix, "run", "build"], { cwd: root, stdio: "inherit" });
}

const metadata = JSON.parse(readFileSync(join(root, "openapi/plaky115-operation-metadata.json"), "utf8"));
const operations = metadata.operations.map(describeOperation);

let sdkClient;
let mcpServer;
let savedFetch;
const sdkStore = [];
const mcpStore = [];
const cliStore = [];
let tmpDir;
let binPath;
let recorder;
let cliBase;

before(async () => {
  ensureBuild("sdk");
  ensureBuild("mcp-server");

  const sdkMod = await import(pathToFileURL(join(root, "sdk/esm/index.js")).href);
  sdkClient = new sdkMod.PlakyClient({
    apiKey: "plk_test",
    serverURL: "http://sdk.parity.local",
    maxRetries: 0,
    fetch: recordingFetch(sdkStore),
  });

  // MCP raw tools use globalThis.fetch (their client passes no explicit fetch).
  savedFetch = globalThis.fetch;
  globalThis.fetch = recordingFetch(mcpStore);
  const mcpMod = await import(pathToFileURL(join(root, "mcp-server/esm/server/index.js")).href);
  ({ server: mcpServer } = mcpMod.buildServer({
    apiKey: "plk_test",
    serverURL: "http://mcp.parity.local",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  }));

  tmpDir = mkdtempSync(join(tmpdir(), "plaky115-parity-"));
  binPath = join(tmpDir, "plaky115-parity");
  execFileSync("go", ["build", "-o", binPath, "./cmd/plaky115"], { cwd: join(root, "cli"), stdio: "inherit" });

  recorder = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let body;
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
      }
      cliStore.push({ method: req.method, url: req.url, body });
      if (req.method === "DELETE") {
        res.statusCode = 204;
        res.end();
      } else {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end("{}");
      }
    });
  });
  await new Promise((resolve) => recorder.listen(0, "127.0.0.1", resolve));
  cliBase = `http://127.0.0.1:${recorder.address().port}`;
});

after(async () => {
  if (savedFetch) globalThis.fetch = savedFetch;
  if (recorder) await new Promise((resolve) => recorder.close(resolve));
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

async function captureSdk(op) {
  const before = sdkStore.length;
  await sdkInvokers[op.operationId](sdkClient);
  assert.equal(sdkStore.length, before + 1, `SDK ${op.operationId} should make exactly one request`);
  return dissect(sdkStore[sdkStore.length - 1]);
}

async function captureMcp(op) {
  const tool = mcpServer._registeredTools[op.mcpName];
  assert.ok(tool, `MCP tool ${op.mcpName} should be registered`);
  const before = mcpStore.length;
  const response = await tool.handler(op.mcpInput);
  assert.notEqual(response.isError, true, `MCP ${op.mcpName} returned an error: ${JSON.stringify(response.structuredContent)}`);
  assert.equal(mcpStore.length, before + 1, `MCP ${op.mcpName} should make exactly one request`);
  return dissect(mcpStore[mcpStore.length - 1]);
}

async function captureCli(op) {
  const before = cliStore.length;
  const args = ["--api-key", "ci-stub", "--server-url", cliBase, "raw", op.cliCmd, ...op.cliFlags];
  await execFileAsync(binPath, args, { env: { ...process.env, PLAKY115_API_KEY: "", PLAKY115_API_KEY_AUTH: "" } });
  assert.equal(cliStore.length, before + 1, `CLI ${op.cliCmd} should make exactly one request`);
  return dissect(cliStore[cliStore.length - 1]);
}

test("all 20 operations are present in the metadata", () => {
  assert.equal(operations.length, 20, `expected 20 operations, got ${operations.length}`);
});

for (const op of operations) {
  test(`parity: ${op.operationId}`, async () => {
    const sdk = await captureSdk(op);
    const mcp = await captureMcp(op);
    const cli = await captureCli(op);

    // Method parity.
    assert.equal(sdk.method, op.method, `SDK method for ${op.operationId}`);
    assert.equal(mcp.method, op.method, `MCP method for ${op.operationId}`);
    assert.equal(cli.method, op.method, `CLI method for ${op.operationId}`);

    // Path parity (concrete, after path-param substitution).
    assert.equal(sdk.pathname, op.concretePath, `SDK path for ${op.operationId}`);
    assert.equal(mcp.pathname, op.concretePath, `MCP path for ${op.operationId}`);
    assert.equal(cli.pathname, op.concretePath, `CLI path for ${op.operationId}`);

    // Query-key parity (and exact pairs, since inputs are identical).
    assert.deepEqual(sdk.queryPairs, op.expectedQueryPairs, `SDK query for ${op.operationId}`);
    assert.deepEqual(mcp.queryPairs, op.expectedQueryPairs, `MCP query for ${op.operationId}`);
    assert.deepEqual(cli.queryPairs, op.expectedQueryPairs, `CLI query for ${op.operationId}`);

    // Body parity for writes; no JSON body for reads/deletes.
    if (op.isWrite) {
      const expectedBody = BODIES[op.operationId];
      assert.deepEqual(sdk.body, expectedBody, `SDK body for ${op.operationId}`);
      assert.deepEqual(mcp.body, expectedBody, `MCP body for ${op.operationId}`);
      assert.deepEqual(cli.body, expectedBody, `CLI body for ${op.operationId}`);
    } else {
      assert.equal(sdk.body, undefined, `SDK ${op.operationId} should send no body`);
      assert.equal(mcp.body, undefined, `MCP ${op.operationId} should send no body`);
      assert.equal(cli.body, undefined, `CLI ${op.operationId} should send no body`);
    }

    // F4 guard: `expand` must be one comma-joined value, never repeated keys.
    if (op.expectsExpand) {
      for (const [label, cap] of [["SDK", sdk], ["MCP", mcp], ["CLI", cli]]) {
        const expandValues = [...new URLSearchParams(cap.queryPairs.join("&")).getAll("expand")];
        assert.equal(expandValues.length, 1, `${label} ${op.operationId} should emit a single expand param`);
        assert.equal(expandValues[0], EXPAND, `${label} ${op.operationId} expand value`);
      }
    }

    // F1 guard: the reaction body is the spec ReactionPutRequest shape
    // (a `reactions` array of `{ value }`), identical across surfaces.
    if (op.operationId === "replaceCommentReactions") {
      for (const [label, cap] of [["SDK", sdk], ["MCP", mcp], ["CLI", cli]]) {
        assert.ok(Array.isArray(cap.body.reactions), `${label} reaction body must carry a reactions array`);
        for (const entry of cap.body.reactions) {
          assert.equal(typeof entry.value, "string", `${label} reaction entry must carry a string value`);
        }
      }
    }
  });
}
