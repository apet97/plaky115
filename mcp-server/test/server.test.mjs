import assert from "node:assert/strict";
import { test } from "node:test";
import { buildServer } from "../esm/server/index.js";
import { selectTools } from "../esm/server/modes.js";
import { filterByScopes } from "../esm/server/scopes.js";

test("buildServer creates an MCP server with at least one tool", () => {
  const { server, tools } = buildServer({
    apiKey: "plk_test",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  });
  assert.ok(server);
  assert.ok(tools.length >= 5, `expected at least 5 tools, got ${tools.length}`);
});

test("buildServer registers tools with output schemas", () => {
  const { server } = buildServer({
    apiKey: "plk_test",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  });
  const registered = server._registeredTools;
  assert.ok(Object.keys(registered).length >= 25);
  for (const [name, tool] of Object.entries(registered)) {
    assert.ok(tool.outputSchema, `${name} missing outputSchema`);
  }
});

test("curated tool response includes text and structuredContent", async () => {
  const { server } = buildServer({
    apiKey: "plk_test",
    mode: "curated",
    scopes: ["read", "write"],
  });
  const tool = server._registeredTools.plaky_search_docs;
  const response = await tool.handler({ query: "spaces", limit: 1 });

  assert.equal(response.content[0].type, "text");
  assert.ok(response.content[0].text.includes("hits"));
  assert.ok(response.structuredContent);
  assert.ok(Array.isArray(response.structuredContent.hits));
});

test("Plaky API errors are returned as tool errors", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "space not found" }), {
      status: 404,
      headers: {
        "content-type": "application/json",
        "x-request-id": "req_123",
      },
    });
  try {
    const { server } = buildServer({
      apiKey: "plk_test",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read"],
    });
    const tool = server._registeredTools.plaky_list_spaces;
    const response = await tool.handler({ page: 1 });

    assert.equal(response.isError, true);
    assert.equal(response.structuredContent.error.name, "PlakyNotFoundError");
    assert.equal(response.structuredContent.error.status, 404);
    assert.equal(response.structuredContent.error.requestId, "req_123");
    assert.ok(response.content[0].text.includes("space not found"));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("raw delete tools return structured ok receipts", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    const { server } = buildServer({
      apiKey: "plk_test",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read", "write", "destructive"],
    });
    const tool = server._registeredTools.plaky_delete_item;
    const response = await tool.handler({ spaceId: 1, boardId: 2, itemId: 3 });

    assert.equal(response.content[0].type, "text");
    assert.deepEqual(response.structuredContent, { ok: true });
    assert.equal(JSON.parse(response.content[0].text).ok, true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("raw write tool rejects a missing body", async () => {
  const previousFetch = globalThis.fetch;
  // Fail loudly if the tool ever reaches the network: a missing required body
  // must be rejected during input validation, before any request is made.
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called when body is missing");
  };
  try {
    const { server } = buildServer({
      apiKey: "plk_test",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read", "write"],
    });
    const tool = server._registeredTools.plaky_create_item;
    await assert.rejects(
      () => tool.handler({ spaceId: 1, boardId: 2 }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(JSON.stringify(error.issues ?? error.message ?? String(error)), /body/i);
        return true;
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("raw write tool accepts a provided body and forwards it to the transport", async () => {
  const previousFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(JSON.stringify({ id: 1, title: "x" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const { server } = buildServer({
      apiKey: "plk_test",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read", "write"],
    });
    const tool = server._registeredTools.plaky_create_item;
    const response = await tool.handler({ spaceId: 1, boardId: 2, body: { title: "x" } });

    assert.equal(response.content[0].type, "text");
    assert.ok(response.structuredContent);
    assert.notEqual(response.isError, true);
    // The provided body must reach the transport unchanged at the create-item path.
    assert.ok(captured, "fetch was not called");
    assert.match(captured.url, /\/v1\/public\/spaces\/1\/boards\/2\/items$/);
    assert.deepEqual(JSON.parse(captured.init.body), { title: "x" });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("--mode generated returns 20 raw tools", () => {
  assert.equal(selectTools("generated").length, 20);
});

test("--mode curated returns 5 curated tools", () => {
  assert.equal(selectTools("curated").length, 5);
});

test("--mode all returns 25 tools total", () => {
  assert.equal(selectTools("all").length, 25);
});

test("--scope read filters out write/destructive tools", () => {
  const tools = filterByScopes(selectTools("all"), new Set(["read"]));
  assert.ok(tools.every((t) => !t.scopes.includes("destructive") && !t.scopes.includes("write")), "no write/destructive tools should be present");
  assert.ok(tools.length > 0, "read-scoped subset should not be empty");
});

test("--scope read includes plaky_search_docs", () => {
  const tools = filterByScopes(selectTools("all"), new Set(["read"]));
  assert.ok(tools.some((t) => t.name === "plaky_search_docs"));
});

test("read-only excludes plaky_execute_workflow (write scope)", () => {
  const tools = filterByScopes(selectTools("all"), new Set(["read"]));
  assert.ok(!tools.some((t) => t.name === "plaky_execute_workflow"));
});

test("destructive scope includes deleteItem raw tool", () => {
  const tools = filterByScopes(selectTools("all"), new Set(["read", "write", "destructive"]));
  assert.ok(tools.some((t) => t.name === "plaky_delete_item"));
});
