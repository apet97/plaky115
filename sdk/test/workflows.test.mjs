import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, workspaceMap, searchItems, bulkUpdateItems, exportItems } from "../esm/index.js";

let fetchMock;
beforeEach(() => {
  fetchMock = () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  globalThis.fetch = async (url, init) => fetchMock(url.toString(), init);
});

test("workspaceMap uses expanded boards across the paginated space sequence", async () => {
  let spaceCalls = 0;
  let boardCalls = 0;
  fetchMock = (u) => {
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      spaceCalls++;
      const url = new URL(u);
      assert.equal(url.searchParams.get("expand"), "board");
      if (url.searchParams.get("page") === "1") {
        return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops", boards: [{ id: 11, title: "Roadmap" }] }], hasMore: true }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ data: [{ id: 2, title: "Eng", boards: [{ id: 21, title: "Bugs" }] }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      boardCalls++;
      return new Response(JSON.stringify({ data: [], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const map = await workspaceMap(c);
  assert.deepEqual(map.map((entry) => entry.id), [1, 2]);
  assert.equal(map[0].boards[0].title, "Roadmap");
  assert.equal(map[1].boards[0].title, "Bugs");
  assert.equal(spaceCalls, 2);
  assert.equal(boardCalls, 0);
});

test("workspaceMap falls back only when an expanded space omits boards", async () => {
  let boardCalls = 0;
  fetchMock = (u) => {
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({
        data: [
          { id: 1, title: "Empty", boards: [] },
          { id: 2, title: "Legacy" },
          { title: "Missing ID" },
        ],
        hasMore: false,
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/2\/boards(\?|$)/)) {
      boardCalls++;
      return new Response(JSON.stringify({ data: [{ id: 21, title: "Fallback" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected request ${u}`);
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });

  const map = await workspaceMap(c);

  assert.deepEqual(map.map((entry) => entry.boards.map((board) => board.title)), [[], ["Fallback"], []]);
  assert.equal(boardCalls, 1);
});

test("workspaceMap preserves an empty partial space page without board requests", async () => {
  let spaceCalls = 0;
  let boardCalls = 0;
  fetchMock = (u) => {
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      spaceCalls++;
      return new Response(JSON.stringify({ data: [], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    boardCalls++;
    return new Response(JSON.stringify({ data: [], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });

  assert.deepEqual(await workspaceMap(c), []);
  assert.equal(spaceCalls, 1);
  assert.equal(boardCalls, 0);
});

test("workspaceMap resolves the space collection once and preserves order", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  let spaceListCalls = 0;
  let boardListCalls = 0;
  c.spaces.listAll = async (options) => {
    spaceListCalls++;
    assert.deepEqual(options, { expand: ["board"] });
    return [
      { id: 3, title: "Third", boards: [{ id: 31, title: "C" }] },
      { id: 1, title: "First", boards: [{ id: 11, title: "A" }] },
    ];
  };
  c.boards.listAll = async () => {
    boardListCalls++;
    return [];
  };

  const map = await workspaceMap(c);

  assert.deepEqual(map.map((entry) => entry.id), [3, 1]);
  assert.equal(spaceListCalls, 1);
  assert.equal(boardListCalls, 0);
});

test("bulkUpdateItems with dryRun records dry-run per update without calling write", async () => {
  let writeCalls = 0;
  fetchMock = (u, init) => {
    if (init?.method === "PATCH") {
      writeCalls++;
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.includes("/items")) {
      return new Response(JSON.stringify({ data: [], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      return new Response(JSON.stringify({ data: [{ id: 11, title: "Roadmap" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const out = await bulkUpdateItems(c, {
    space: 1,
    board: 11,
    updates: [{ itemId: 100, body: { Status: "Done" } }, { itemId: 101, body: { Status: "In Progress" } }],
    dryRun: true,
  });
  assert.equal(writeCalls, 0);
  assert.equal(out.length, 2);
  assert.ok(out.every((r) => r.status === "dry-run"));
});

test("bulkUpdateItems reports updated/error per item and continues past a failure", async () => {
  fetchMock = (u, init) => {
    if (init?.method === "PATCH") {
      if (u.includes("/items/101/")) {
        return new Response(JSON.stringify({ message: "boom" }), { status: 500, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ id: 100 }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      return new Response(JSON.stringify({ data: [{ id: 11, title: "Roadmap" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x", maxRetries: 0 });
  const out = await bulkUpdateItems(c, {
    space: 1,
    board: 11,
    updates: [{ itemId: 100, body: { Status: "Done" } }, { itemId: 101, body: { Status: "X" } }],
  });
  assert.equal(out.length, 2);
  assert.equal(out[0].status, "updated");
  assert.equal(out[1].status, "error");
  assert.ok(out[1].detail, "the failed update should carry an error detail");
});

test("exportItems csv expands fields into per-field columns with RFC4180 quoting", async () => {
  fetchMock = (u) => {
    if (u.includes("/items")) {
      return new Response(JSON.stringify({ data: [
        { id: 1, title: "A, comma", fields: [{ key: "status-1", name: "Status", value: "Blocked" }, { key: "number-1", name: "Estimate", value: 3 }] },
        { id: 2, title: "B \"q\"", fields: [{ key: "status-1", name: "Status", value: "Done" }] },
      ], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      return new Response(JSON.stringify({ data: [{ id: 11, title: "Roadmap" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const out = await exportItems(c, { space: 1, board: 11, format: "csv" });
  // Header: sorted top-level keys (id, title), then sorted field labels (Estimate,
  // Status). This exact string (trailing newline included) is what the Go CLI's
  // TestItemsExportCSV asserts for the same items — the two surfaces are byte-
  // identical for scalar field values.
  assert.equal(out, "id,title,Estimate,Status\n1,\"A, comma\",3,Blocked\n2,\"B \"\"q\"\"\",,Done\n");
});

test("exportItems jsonl serializes each item to a line", async () => {
  fetchMock = (u) => {
    if (u.includes("/items")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "A" }, { id: 2, title: "B" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      return new Response(JSON.stringify({ data: [{ id: 11, title: "Roadmap" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const out = await exportItems(c, { space: 1, board: 11, format: "jsonl" });
  const lines = out.split("\n");
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), { id: 1, title: "A" });
});

test("searchItems filters by title fragment", async () => {
  fetchMock = (u) => {
    if (u.includes("/items")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ship API wrapper" }, { id: 2, title: "Bug triage" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      return new Response(JSON.stringify({ data: [{ id: 11, title: "Roadmap" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const items = await searchItems(c, { space: 1, board: 11, query: "wrapper" });
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Ship API wrapper");
});

test("searchItems matches a field value, not just the title", async () => {
  fetchMock = (u) => {
    if (u.includes("/items")) {
      return new Response(JSON.stringify({ data: [
        { id: 1, title: "Task one", fields: [{ key: "status-1", title: "Status", type: "STATUS", value: "Blocked" }] },
        { id: 2, title: "Task two", fields: [{ key: "status-1", title: "Status", type: "STATUS", value: "Done" }] },
      ], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.match(/\/spaces\/\d+\/boards(\?|$)/)) {
      return new Response(JSON.stringify({ data: [{ id: 11, title: "Roadmap" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: [{ id: 1, title: "Ops" }], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const items = await searchItems(c, { space: 1, board: 11, query: "blocked" });
  assert.equal(items.length, 1);
  assert.equal(items[0].id, 1);
});
