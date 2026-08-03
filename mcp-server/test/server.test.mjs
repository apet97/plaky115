import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlakyTimeoutError } from "plaky115";
import { buildServer, toToolErrorResponse } from "../esm/server/index.js";
import { parseMode, selectTools } from "../esm/server/modes.js";
import { filterByScopes, parseScopes } from "../esm/server/scopes.js";

const binPath = fileURLToPath(new URL("../bin/mcp-server.js", import.meta.url));

function runBin(args, env = {}) {
  const cleanEnv = { ...process.env, PLAKY115_API_KEY: "", PLAKY115_API_KEY_AUTH: "", ...env };
  return spawnSync(process.execPath, [binPath, ...args], { encoding: "utf8", env: cleanEnv, timeout: 5_000 });
}

async function connectedServer(options) {
  const { server } = buildServer(options);
  const client = new Client({ name: "plaky115-server-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

test("buildServer creates an MCP server with at least one tool", () => {
  const { server, tools } = buildServer({
    apiKey: "test-api-key",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  });
  assert.ok(server);
  assert.ok(tools.length >= 5, `expected at least 5 tools, got ${tools.length}`);
});

test("buildServer registers tools with output schemas", () => {
  return connectedServer({
    apiKey: "test-api-key",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  }).then(async ({ client, server }) => {
    try {
      const { tools } = await client.listTools();
      assert.equal(tools.length, 39);
      for (const tool of tools) assert.ok(tool.outputSchema, `${tool.name} missing outputSchema`);
    } finally {
      await server.close();
    }
  });
});

test("curated tool response includes text and structuredContent", async () => {
  const { client, server } = await connectedServer({
    apiKey: "test-api-key",
    mode: "curated",
    scopes: ["read", "write"],
  });
  try {
    const response = await client.callTool({ name: "plaky_search_docs", arguments: { query: "spaces", limit: 1 } });
    assert.equal(response.content[0].type, "text");
    assert.ok(response.content[0].text.includes("hits"));
    assert.ok(response.structuredContent);
    assert.ok(Array.isArray(response.structuredContent.hits));
  } finally {
    await server.close();
  }
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
    const { client, server } = await connectedServer({
      apiKey: "test-api-key",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read"],
    });
    try {
      const response = await client.callTool({ name: "plaky_list_spaces", arguments: { page: 1 } });
      assert.equal(response.isError, true);
      assert.equal(response.structuredContent.error.category, "api");
      assert.equal(response.structuredContent.error.name, "PlakyNotFoundError");
      assert.equal(response.structuredContent.error.status, 404);
      assert.equal(response.structuredContent.error.requestId, "req_123");
      assert.equal(response.structuredContent.error.retryable, false);
      assert.ok(response.content[0].text.includes("space not found"));
    } finally {
      await server.close();
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("timeout errors are structured and marked retryable", () => {
  const response = toToolErrorResponse(new PlakyTimeoutError("request timed out"));
  assert.equal(response.isError, true);
  assert.deepEqual(response.structuredContent, {
    error: {
      category: "timeout",
      name: "PlakyTimeoutError",
      message: "request timed out",
      retryable: true,
    },
  });
});

test("unexpected programmer errors propagate as redacted protocol errors", async () => {
  const tool = selectTools("curated").find((candidate) => candidate.name === "plaky_search_docs");
  assert.ok(tool);
  const originalHandler = tool.handler;
  const leakedToken = ["pl", "k_", "super_secret_value"].join("");
  tool.handler = async () => {
    throw new Error(`programmer bug exposed ${leakedToken}`);
  };
  const { client, server } = await connectedServer({ apiKey: "test-api-key", mode: "curated", scopes: ["read"] });
  try {
    await assert.rejects(
      client.callTool({ name: tool.name, arguments: { query: "spaces" } }),
      (error) => {
        assert.doesNotMatch(error.message, new RegExp(leakedToken));
        assert.match(error.message, /\[REDACTED_PLAKY_API_KEY\]/);
        return true;
      },
    );
  } finally {
    tool.handler = originalHandler;
    await server.close();
  }
});

test("raw delete tools return structured ok receipts", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });
  try {
    const { client, server } = await connectedServer({
      apiKey: "test-api-key",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read", "write", "destructive"],
    });
    try {
      const response = await client.callTool({ name: "plaky_delete_item", arguments: { spaceId: 1, boardId: 2, itemId: 3 } });
      assert.equal(response.content[0].type, "text");
      assert.deepEqual(response.structuredContent, { ok: true });
      assert.equal(JSON.parse(response.content[0].text).ok, true);
    } finally {
      await server.close();
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("execute_workflow accepts both space/board/item and spaceId/boardId/itemId spellings", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/spaces/1")) return Response.json({ id: 1, title: "Space" });
    if (path.endsWith("/spaces/1/boards/2")) return Response.json({ id: 2, title: "Board" });
    if (path.endsWith("/spaces/1/boards/2/items/3")) return Response.json({ id: 3, title: "Item" });
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: 1, title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: 2, title: "Board" }], hasMore: false });
    if (path.endsWith("/items")) return Response.json({ data: [{ id: 3, title: "Item" }], hasMore: false });
    return Response.json([{ id: 1, content: "hi", createdAt: "t", createdBy: 7 }]);
  };
  try {
    const { client, server } = await connectedServer({ apiKey: "test-api-key", serverURL: "https://example.test", mode: "all", scopes: ["read", "write"] });
    try {
      const canonical = await client.callTool({ name: "plaky_execute_workflow", arguments: { workflowId: "comments.thread", input: { spaceId: 1, boardId: 2, itemId: 3 } } });
      assert.equal(canonical.structuredContent.data.length, 1);
      const alternate = await client.callTool({ name: "plaky_execute_workflow", arguments: { workflowId: "comments.thread", input: { space: 1, board: 2, item: 3 } } });
      assert.equal(alternate.structuredContent.data.length, 1);
    } finally {
      await server.close();
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("execute_workflow fails fast with a clear message when a required entity id is missing", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should not be called when an id is missing");
  };
  try {
    const { client, server } = await connectedServer({ apiKey: "test-api-key", serverURL: "https://example.test", mode: "all", scopes: ["read", "write"] });
    try {
      const response = await client.callTool({ name: "plaky_execute_workflow", arguments: { workflowId: "comments.thread", input: { boardId: 2, itemId: 3 } } });
      assert.equal(response.isError, true);
      assert.match(response.content[0].text, /missing required input.*spaceId/i);
    } finally {
      await server.close();
    }
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
    const { client, server } = await connectedServer({
      apiKey: "test-api-key",
      serverURL: "https://example.test",
      mode: "generated",
      scopes: ["read", "write"],
    });
    try {
      const response = await client.callTool({ name: "plaky_create_item", arguments: { spaceId: 1, boardId: 2, body: { title: "x" } } });
      assert.equal(response.content[0].type, "text");
      assert.ok(response.structuredContent);
      assert.notEqual(response.isError, true);
      assert.ok(captured, "fetch was not called");
      assert.match(captured.url, /\/v1\/public\/spaces\/1\/boards\/2\/items$/);
      assert.deepEqual(JSON.parse(captured.init.body), { title: "x" });
    } finally {
      await server.close();
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("--mode generated returns 32 raw tools", () => {
  assert.equal(selectTools("generated").length, 32);
});

test("--mode curated returns 7 curated tools", () => {
  assert.equal(selectTools("curated").length, 7);
});

test("--mode all returns 39 tools total", () => {
  assert.equal(selectTools("all").length, 39);
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

test("mode and scope parsers default to curated read-only", () => {
  assert.equal(parseMode(undefined), "curated");
  assert.deepEqual(parseScopes([]), ["read"]);
});

test("scope parsing dedupes repeated values while preserving order", () => {
  assert.deepEqual(parseScopes(["write", "read", "write", "destructive", "read"]), ["write", "read", "destructive"]);
});

test("invalid mode and scope values fail closed", () => {
  assert.throws(() => parseMode("typo"), /invalid mode/i);
  assert.throws(() => parseScopes(["read", "typo"]), /invalid scope/i);
});

test("help succeeds without an API key and documents safe defaults", () => {
  const result = runBin(["--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /curated.*default/i);
  assert.match(result.stdout, /Scopes default to read/i);
});

for (const [label, args] of [
  ["invalid mode", ["--mode", "typo"]],
  ["invalid scope", ["--scope", "typo"]],
  ["unknown flag", ["--unknown"]],
  ["positional argument", ["unexpected"]],
]) {
  test(`${label} exits 2 without starting transport`, () => {
    const result = runBin(args);
    assert.equal(result.status, 2, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stderr, /invalid|unknown|unexpected|usage/i);
  });
}

test("missing key exits 1 after valid safe-default parsing", () => {
  const result = runBin([]);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /PLAKY115_API_KEY/);
});

test("explicit broad mode and scopes remain valid", () => {
  assert.equal(parseMode("all"), "all");
  const scopes = parseScopes(["read", "write", "destructive"]);
  assert.deepEqual(scopes, ["read", "write", "destructive"]);
  assert.equal(filterByScopes(selectTools("all"), new Set(scopes)).length, 39);

  const result = runBin(["--mode", "all", "--scope", "read", "--scope", "write", "--scope", "destructive"]);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /PLAKY115_API_KEY/);
});
