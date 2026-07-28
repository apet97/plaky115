import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, beforeEach } from "node:test";
import { PlakyClient, workspaceMap, searchItems, searchItemsDetailed, bulkUpdateItems, exportItems } from "../esm/index.js";

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

test("bulkUpdateItems can stop after an ambiguous write failure", async () => {
  let writeCalls = 0;
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  c.spaces.listAll = async () => [{ id: 1, title: "Ops" }];
  c.boards.listAll = async () => [{ id: 11, title: "Roadmap" }];
  c.items.updateFields = async () => {
    writeCalls++;
    throw new Error("possibly committed");
  };

  await assert.rejects(bulkUpdateItems(c, {
    space: 1,
    board: 11,
    updates: [{ itemId: 100, body: {} }, { itemId: 101, body: {} }],
    throwOnError: true,
  }), /possibly committed/);
  assert.equal(writeCalls, 1);
});

test("bulkUpdateItems forwards cancellation to the in-flight write", async () => {
  const controller = new AbortController();
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  c.spaces.listAll = async () => [{ id: 1, title: "Ops" }];
  c.boards.listAll = async () => [{ id: 11, title: "Roadmap" }];
  c.items.updateFields = async (_input, options) => {
    assert.equal(options?.signal, controller.signal);
    controller.abort();
    throw options.signal.reason;
  };

  await assert.rejects(bulkUpdateItems(c, {
    space: 1,
    board: 11,
    updates: [{ itemId: 100, body: {} }],
    signal: controller.signal,
    throwOnError: true,
  }), (error) => error?.name === "AbortError");
});

test("exportItems csv byte-matches the shared safe and raw fixtures", async () => {
  const fixtureItems = JSON.parse(readFileSync(new URL("../../test/fixtures/export/items.json", import.meta.url), "utf8"));
  const expectedSafe = readFileSync(new URL("../../test/fixtures/export/items.safe.csv", import.meta.url), "utf8");
  const expectedRaw = readFileSync(new URL("../../test/fixtures/export/items.raw.csv", import.meta.url), "utf8");
  fetchMock = (u) => {
    if (u.includes("/items")) {
      return new Response(JSON.stringify({ data: fixtureItems, hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
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
  assert.equal(await exportItems(c, { space: 1, board: 11, format: "csv" }), expectedSafe);
  assert.equal(await exportItems(c, { space: 1, board: 11, format: "csv", csvSafety: "raw" }), expectedRaw);
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

function detailedSearchClient(pages) {
  const client = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  client.spaces.listAll = async () => [{ id: 1, title: "Ops" }];
  client.boards.listAll = async () => [{ id: 11, title: "Roadmap" }];
  const requests = [];
  client.items.list = async (params) => {
    requests.push(params);
    return pages[params.page - 1] ?? { data: [], hasMore: false };
  };
  return { client, requests };
}

test("searchItemsDetailed walks pages and searches stable nested field values", async () => {
  const { client, requests } = detailedSearchClient([
    {
      data: [
        { id: 1, title: "First", fields: [{ value: { z: false, a: ["quiet", { count: 7 }] } }] },
        { id: 2, title: "Second", fields: [{ value: "no match" }] },
      ],
      hasMore: true,
    },
    { data: [{ id: 3, title: "Third", fields: [{ value: [null, "Needle"] }] }], hasMore: false },
  ]);

  const result = await searchItemsDetailed(client, { space: 1, board: 11, query: "needle" });

  assert.deepEqual(result.data.map((item) => item.id), [3]);
  assert.deepEqual(result, { data: result.data, scanned: 3, matched: 1, truncated: false });
  assert.deepEqual(requests.map(({ page, pageSize }) => ({ page, pageSize })), [
    { page: 1, pageSize: 100 },
    { page: 2, pageSize: 100 },
  ]);
});

test("searchItemsDetailed reports scan-limit truncation and nextPage without over-fetching", async () => {
  const { client, requests } = detailedSearchClient([
    { data: [{ id: 1, title: "one" }, { id: 2, title: "two" }], hasMore: true },
    { data: [{ id: 3, title: "three" }], hasMore: false },
  ]);

  const result = await searchItemsDetailed(client, { space: 1, board: 11, query: "", limit: 2 });

  assert.deepEqual(result.data.map((item) => item.id), [1, 2]);
  assert.deepEqual(result, { data: result.data, scanned: 2, matched: 2, truncated: true, nextPage: 2 });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].pageSize, 2);
});

test("searchItemsDetailed treats an exact complete boundary as not truncated", async () => {
  const { client } = detailedSearchClient([
    { data: [{ id: 1, title: "one" }, { id: 2, title: "two" }], hasMore: false },
  ]);

  const result = await searchItemsDetailed(client, { space: 1, board: 11, query: "", limit: 2 });

  assert.deepEqual(result, { data: result.data, scanned: 2, matched: 2, truncated: false });
  assert.equal("nextPage" in result, false);
});

test("searchItemsDetailed preserves empty and whitespace query compatibility", async () => {
  const empty = detailedSearchClient([{ data: [{ id: 1, title: "one" }, { id: 2, title: "two" }], hasMore: false }]);
  const whitespace = detailedSearchClient([{ data: [{ id: 1, title: "one" }, { id: 2, title: "has space" }], hasMore: false }]);

  assert.equal((await searchItemsDetailed(empty.client, { space: 1, board: 11, query: "" })).matched, 2);
  assert.deepEqual((await searchItemsDetailed(whitespace.client, { space: 1, board: 11, query: " " })).data.map((item) => item.id), [2]);
});

test("searchItemsDetailed validates the scan limit before resolving entities", async () => {
  for (const limit of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    const { client, requests } = detailedSearchClient([]);
    await assert.rejects(searchItemsDetailed(client, { space: 1, board: 11, query: "x", limit }), /limit/);
    assert.equal(requests.length, 0);
  }
});

test("deprecated searchItems remains an array-returning compatibility wrapper", async () => {
  const { client } = detailedSearchClient([{ data: [{ id: 1, title: "match" }], hasMore: false }]);
  const result = await searchItems(client, { space: 1, board: 11, query: "match" });
  assert.ok(Array.isArray(result));
  assert.deepEqual(result.map((item) => item.id), [1]);
});
