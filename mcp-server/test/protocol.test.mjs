import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../esm/server/index.js";

async function connectedPair(options = {}) {
  const { server } = buildServer({
    apiKey: "test-api-key",
    mode: "all",
    scopes: ["read", "write", "destructive"],
    ...options,
  });
  const client = new Client({ name: "plaky115-test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

test("public listTools exposes registered tools and output schemas", async () => {
  const { client, server } = await connectedPair();
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 39);
    assert.ok(tools.some((tool) => tool.name === "plaky_search_docs"));
    assert.ok(tools.some((tool) => tool.name === "plaky_upload_item_file"));
    for (const tool of tools) assert.ok(tool.outputSchema, `${tool.name} missing outputSchema`);
  } finally {
    await server.close();
  }
});

test("public callTool invokes a known curated tool", async () => {
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read"] });
  try {
    const response = await client.callTool({ name: "plaky_search_docs", arguments: { query: "spaces", limit: 1 } });
    assert.notEqual(response.isError, true);
    assert.ok(Array.isArray(response.structuredContent.hits));
  } finally {
    await server.close();
  }
});

test("a tool filtered out by scope is rejected as unknown over the protocol", async () => {
  const { client, server } = await connectedPair({ scopes: ["read"] });
  try {
    const response = await client.callTool({ name: "plaky_delete_item", arguments: { spaceId: 1, boardId: 2, itemId: 3 } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /not found/i);
  } finally {
    await server.close();
  }
});

test("known Plaky API errors stay structured through public callTool", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "space not found" }), {
      status: 404,
      headers: { "content-type": "application/json", "x-request-id": "req_public" },
    });
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["read"], serverURL: "https://example.test" });
  try {
    const response = await client.callTool({ name: "plaky_list_spaces", arguments: { page: 1 } });
    assert.equal(response.isError, true);
    assert.equal(response.structuredContent.error.category, "api");
    assert.equal(response.structuredContent.error.name, "PlakyNotFoundError");
    assert.equal(response.structuredContent.error.status, 404);
    assert.equal(response.structuredContent.error.requestId, "req_public");
    assert.equal(response.structuredContent.error.retryable, false);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("unknown tool calls use the public SDK's in-band not-found response", async () => {
  const { client, server } = await connectedPair();
  try {
    const response = await client.callTool({ name: "plaky_missing_tool", arguments: {} });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /not found/i);
  } finally {
    await server.close();
  }
});

test("invalid known-tool arguments return the standard validation envelope", async () => {
  const { client, server } = await connectedPair();
  try {
    const response = await client.callTool({ name: "plaky_search_docs", arguments: {} });
    assert.equal(response.isError, true);
    assert.deepEqual(Object.keys(response.structuredContent.error).sort(), ["category", "message", "name", "retryable"]);
    assert.equal(response.structuredContent.error.category, "validation");
    assert.equal(response.structuredContent.error.name, "ZodError");
    assert.equal(response.structuredContent.error.retryable, false);
    assert.match(response.structuredContent.error.message, /query/i);
  } finally {
    await server.close();
  }
});

test("missing required body surfaces as an in-band tool error over the protocol", async () => {
  const { client, server } = await connectedPair();
  try {
    const response = await client.callTool({ name: "plaky_create_item", arguments: { spaceId: 1, boardId: 2 } });
    assert.equal(response.isError, true);
    assert.equal(response.structuredContent.error.category, "validation");
    assert.match(response.structuredContent.error.message, /body/i);
  } finally {
    await server.close();
  }
});

test("raw int64 identifiers preserve decimal strings and reject unsafe numbers before fetch", async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  let path = "";
  globalThis.fetch = async (url) => {
    calls++;
    path = new URL(url).pathname;
    return new Response("{}", { headers: { "content-type": "application/json" } });
  };
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["read"], serverURL: "https://example.test" });
  try {
    const exact = await client.callTool({ name: "plaky_get_space", arguments: { spaceId: "9007199254740992" } });
    assert.notEqual(exact.isError, true);
    assert.match(path, /\/9007199254740992$/);

    const unsafe = await client.callTool({ name: "plaky_get_space", arguments: { spaceId: 9007199254740992 } });
    assert.equal(unsafe.isError, true);
    assert.equal(calls, 1);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("raw required JSON bodies reject non-object roots before fetch", async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("{}"); };
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["write"], serverURL: "https://example.test" });
  try {
    for (const body of [null, [], "value", 1, true]) {
      const response = await client.callTool({ name: "plaky_create_item", arguments: { spaceId: 1, boardId: 2, body } });
      assert.equal(response.isError, true);
    }
    assert.equal(calls, 0);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("upload validation failures return the standard validation envelope", async () => {
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["write"] });
  try {
    const response = await client.callTool({
      name: "plaky_upload_item_file",
      arguments: { spaceId: 1, boardId: 2, itemId: 3, fileBase64: "not canonical!", fileName: "x.txt" },
    });
    assert.equal(response.isError, true);
    assert.equal(response.structuredContent.error.category, "validation");
    assert.equal(response.structuredContent.error.name, "UploadValidationError");
    assert.equal(response.structuredContent.error.retryable, false);
    assert.match(response.structuredContent.error.message, /canonical base64/i);
  } finally {
    await server.close();
  }
});

test("connection and decode failures use safe retry-aware envelopes", async () => {
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new TypeError("connection refused");
    };
    let pair = await connectedPair({ mode: "generated", scopes: ["read"], serverURL: "https://example.test" });
    try {
      const response = await pair.client.callTool({ name: "plaky_list_spaces", arguments: {} });
      assert.equal(response.structuredContent.error.category, "connection");
      assert.equal(response.structuredContent.error.retryable, true);
    } finally {
      await pair.server.close();
    }

    globalThis.fetch = async () => new Response("not-json", { status: 200, headers: { "content-type": "application/json", "x-request-id": "req_decode" } });
    pair = await connectedPair({ mode: "generated", scopes: ["read"], serverURL: "https://example.test" });
    try {
      const response = await pair.client.callTool({ name: "plaky_list_spaces", arguments: {} });
      assert.equal(response.structuredContent.error.category, "decode");
      assert.equal(response.structuredContent.error.requestId, "req_decode");
      assert.equal(response.structuredContent.error.retryable, false);
    } finally {
      await pair.server.close();
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("sensitive download URLs remain available only in the direct tool response", async () => {
  const previousFetch = globalThis.fetch;
  const signedURL = "https://download.example.test/file?signature=direct-response-only";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ url: signedURL, expiresInSeconds: 60 }), {
      headers: { "content-type": "application/json" },
    });
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["read"], serverURL: "https://example.test" });
  try {
    const response = await client.callTool({
      name: "plaky_get_item_file_download",
      arguments: { spaceId: 1, boardId: 2, itemId: 3, itemFileId: 4 },
    });
    assert.equal(response.structuredContent.url, signedURL);
    assert.equal(response.structuredContent.expiresInSeconds, 60);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("listed tool input parameters include useful descriptions", async () => {
  const { client, server } = await connectedPair();
  try {
    const { tools } = await client.listTools();
    const missing = [];
    for (const tool of tools) {
      for (const [param, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
        const description = typeof schema.description === "string" ? schema.description.trim() : "";
        if (description.length < 3 || description.toLowerCase() === param.toLowerCase()) {
          missing.push(`${tool.name}.${param}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  } finally {
    await server.close();
  }
});

test("read workflows are available under read scope while mutation execution is absent", async () => {
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read"] });
  try {
    const { tools } = await client.listTools();
    assert.ok(tools.some((tool) => tool.name === "plaky_execute_read_workflow"));
    assert.ok(tools.some((tool) => tool.name === "plaky_plan_mutation"));
    assert.ok(!tools.some((tool) => tool.name === "plaky_execute_mutation_workflow"));
  } finally {
    await server.close();
  }
});

test("every read workflow accepts its exact valid input", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url.toString()).pathname;
    if (path.endsWith("/spaces/1")) return Response.json({ id: 1, title: "Space" });
    if (path.endsWith("/spaces/1/boards/2")) return Response.json({ id: 2, title: "Board" });
    if (path.endsWith("/spaces/1/boards/2/items/3")) return Response.json({ id: 3, title: "Item" });
    if (path.endsWith("/comments")) return new Response("[]", { headers: { "content-type": "application/json" } });
    if (path.endsWith("/items")) return new Response(JSON.stringify({ data: [{ id: 3, title: "Item" }], hasMore: false }), { headers: { "content-type": "application/json" } });
    if (path.endsWith("/boards")) return new Response(JSON.stringify({ data: [{ id: 2, title: "Board" }], hasMore: false }), { headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ data: [{ id: 1, title: "Space" }], hasMore: false }), { headers: { "content-type": "application/json" } });
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read"], serverURL: "https://example.test" });
  try {
    const inputs = [
      { workflowId: "workspace.map", input: {} },
      { workflowId: "items.search", input: { spaceId: 1, boardId: 2, query: "needle", limit: 5 } },
      { workflowId: "comments.thread", input: { spaceId: 1, boardId: 2, itemId: 3, limit: 5 } },
      { workflowId: "export.items", input: { spaceId: 1, boardId: 2, format: "jsonl" } },
    ];
    for (const args of inputs) {
      const response = await client.callTool({ name: "plaky_execute_read_workflow", arguments: args });
      assert.notEqual(response.isError, true, `${args.workflowId}: ${response.content[0].text}`);
    }
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("item search emits bounded progress only when the client supplies a token", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/spaces/1")) return Response.json({ id: 1, title: "Space" });
    if (path.endsWith("/spaces/1/boards/2")) return Response.json({ id: 2, title: "Board" });
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: 1, title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: 2, title: "Board" }], hasMore: false });
    return Response.json({ data: [{ id: 3, title: "Item" }], hasMore: false });
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read"], serverURL: "https://example.test" });
  try {
    const progress = [];
    const response = await client.callTool({
      name: "plaky_execute_read_workflow",
      arguments: { workflowId: "items.search", input: { spaceId: 1, boardId: 2, query: "Item", limit: 10 } },
    }, undefined, { onprogress: (value) => progress.push(value) });
    assert.notEqual(response.isError, true);
    assert.ok(progress.length <= 10);
    assert.deepEqual(progress.at(-1), { progress: 1, total: 10, message: "items scanned" });
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("every mutation workflow and mutation plan resolves exact targets without writing by default", async () => {
  let writeCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if ((init?.method ?? "GET") !== "GET") writeCalls++;
    const path = new URL(url).pathname;
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: "1", title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: "2", title: "Board" }], hasMore: false });
    if (path.endsWith("/item-groups")) return Response.json({ data: [{ id: "4", title: "Group" }], hasMore: false });
    if (path.endsWith("/files")) return Response.json([{ id: "5", name: "old.txt" }]);
    if (path.endsWith("/items")) return Response.json({ data: [{ id: "3", title: "Item" }], hasMore: false });
    throw new Error(`unexpected dry-run path: ${path}`);
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const inputs = [
      { workflowId: "items.create", input: { spaceId: "Space", boardId: "Board", body: { title: "New" } } },
      { workflowId: "items.updateFields", input: { spaceId: "Space", boardId: "Board", updates: [{ itemId: "Item", body: { Status: "Done" } }] } },
      { workflowId: "comments.add", input: { spaceId: "Space", boardId: "Board", itemId: "Item", text: "Note" } },
      { workflowId: "itemGroups.create", input: { spaceId: "Space", boardId: "Board", body: { title: "New group", color: "#123456" } } },
      { workflowId: "itemGroups.update", input: { spaceId: "Space", boardId: "Board", itemGroupId: "Group", body: { title: "Group", ranking: "m", color: "#654321" } } },
      { workflowId: "itemFiles.upload", input: { spaceId: "Space", boardId: "Board", itemId: "Item", fileBase64: "aGk=", fileName: "note.txt", contentType: "text/plain" } },
      { workflowId: "itemFiles.update", input: { spaceId: "Space", boardId: "Board", itemId: "Item", itemFileId: "old.txt", body: { name: "new.txt" } } },
    ];
    for (const args of inputs) {
      const executed = await client.callTool({ name: "plaky_execute_mutation_workflow", arguments: args });
      assert.notEqual(executed.isError, true, `${args.workflowId}: ${executed.content[0].text}`);
      assert.equal(executed.structuredContent.dryRun, true);
      assert.equal(executed.structuredContent.input.spaceId, "1");
      assert.equal(executed.structuredContent.input.boardId, "2");
      const planned = await client.callTool({ name: "plaky_plan_mutation", arguments: args });
      assert.notEqual(planned.isError, true, `${args.workflowId}: ${planned.content[0].text}`);
      assert.equal(planned.structuredContent.dryRun, true);
      assert.equal(planned.structuredContent.input.spaceId, "1");
      assert.equal(planned.structuredContent.input.boardId, "2");
      if (args.workflowId === "itemFiles.upload") {
        assert.equal("fileBase64" in planned.structuredContent.input, false);
        assert.equal(planned.structuredContent.input.decodedBytes, 2);
      }
    }
    assert.equal(writeCalls, 0);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("new mutation workflows return completed receipts with exact target IDs", async () => {
  let writeCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const method = init?.method ?? "GET";
    const path = new URL(url).pathname;
    if (method !== "GET") {
      writeCalls++;
      assert.ok(init.signal instanceof AbortSignal, `${method} ${path} must carry the MCP cancellation signal`);
      return Response.json({ id: path.endsWith("/files") ? "50" : path.endsWith("/item-groups") ? "40" : path.split("/").at(-1) });
    }
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: "1", title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: "2", title: "Board" }], hasMore: false });
    if (path.endsWith("/item-groups")) return Response.json({ data: [{ id: "4", title: "Group" }], hasMore: false });
    if (path.endsWith("/files")) return Response.json([{ id: "5", name: "old.txt" }]);
    if (path.endsWith("/items")) return Response.json({ data: [{ id: "3", title: "Item" }], hasMore: false });
    throw new Error(`unexpected receipt path: ${path}`);
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const inputs = [
      { workflowId: "itemGroups.create", input: { spaceId: "Space", boardId: "Board", body: { title: "New group", color: "#123456" } } },
      { workflowId: "itemGroups.update", input: { spaceId: "Space", boardId: "Board", itemGroupId: "Group", body: { title: "Group", ranking: "m", color: "#654321" } } },
      { workflowId: "itemFiles.upload", input: { spaceId: "Space", boardId: "Board", itemId: "Item", fileBase64: "aGk=", fileName: "note.txt" } },
      { workflowId: "itemFiles.update", input: { spaceId: "Space", boardId: "Board", itemId: "Item", itemFileId: "old.txt", body: { name: "new.txt" } } },
    ];
    for (const args of inputs) {
      const response = await client.callTool({
        name: "plaky_execute_mutation_workflow",
        arguments: { ...args, dryRun: false },
      });
      assert.notEqual(response.isError, true, `${args.workflowId}: ${response.content[0].text}`);
      assert.equal(response.structuredContent.workflowId, args.workflowId);
      assert.equal(response.structuredContent.status, "completed");
      assert.equal(response.structuredContent.targetIds.spaceId, "1");
      assert.equal(response.structuredContent.targetIds.boardId, "2");
    }
    assert.equal(writeCalls, inputs.length);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("curated mutation errors are ambiguous, non-retryable, and retain receipts", async () => {
  let writeCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const method = init?.method ?? "GET";
    const path = new URL(url).pathname;
    if (method !== "GET") {
      writeCalls++;
      return Response.json({ message: "mutation failed" }, { status: 500 });
    }
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: "1", title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: "2", title: "Board" }], hasMore: false });
    throw new Error(`unexpected mutation failure path: ${path}`);
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const response = await client.callTool({
      name: "plaky_execute_mutation_workflow",
      arguments: {
        workflowId: "itemGroups.create",
        input: { spaceId: "Space", boardId: "Board", body: { title: "New group", color: "#123456" } },
        dryRun: false,
      },
    });
    assert.equal(response.isError, true);
    const error = response.structuredContent.error;
    assert.equal(error.category, "api");
    assert.equal(error.retryable, false);
    assert.equal(error.attempted, true);
    assert.equal(error.mayHaveCommitted, true);
    assert.equal(error.phase, "response");
    assert.equal(error.receipts[0].status, "ambiguous");
    assert.equal(error.receipts[0].targetIds.spaceId, "1");
    assert.equal(error.receipts[0].targetIds.boardId, "2");
    assert.equal(writeCalls, 1);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("curated create without a canonical ID returns an ambiguous receipt", async () => {
  let writeCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const method = init?.method ?? "GET";
    const path = new URL(url).pathname;
    if (method !== "GET") {
      writeCalls++;
      return Response.json({ title: "created without id" });
    }
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: "1", title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: "2", title: "Board" }], hasMore: false });
    throw new Error(`unexpected missing-id path: ${path}`);
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const response = await client.callTool({
      name: "plaky_execute_mutation_workflow",
      arguments: {
        workflowId: "itemGroups.create",
        input: { spaceId: "Space", boardId: "Board", body: { title: "New group", color: "#123456" } },
        dryRun: false,
      },
    });
    assert.equal(response.isError, true);
    const error = response.structuredContent.error;
    assert.equal(error.name, "McpMutationAttemptError");
    assert.equal(error.retryable, false);
    assert.equal(error.attempted, true);
    assert.equal(error.mayHaveCommitted, true);
    assert.equal(error.receipts[0].status, "ambiguous");
    assert.equal(writeCalls, 1);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("every generated mutation operation makes at most one transport attempt", async () => {
  const mutationCases = [
    ["plaky_create_item", { spaceId: 1, boardId: 2, body: {} }],
    ["plaky_update_item_field", { spaceId: 1, boardId: 2, itemId: 3, itemFieldKey: "Status", body: {} }],
    ["plaky_update_item_fields", { spaceId: 1, boardId: 2, itemId: 3, body: {} }],
    ["plaky_delete_item", { spaceId: 1, boardId: 2, itemId: 3 }],
    ["plaky_create_item_comment", { spaceId: 1, boardId: 2, itemId: 3, body: { text: "Note" } }],
    ["plaky_update_item_comment", { spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4, body: { text: "Note" } }],
    ["plaky_delete_item_comment", { spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4 }],
    ["plaky_replace_comment_reactions", { spaceId: 1, boardId: 2, itemId: 3, itemCommentId: 4, body: { reactions: [] } }],
    ["plaky_create_item_group", { spaceId: 1, boardId: 2, body: { title: "Group", color: "#123456" } }],
    ["plaky_update_item_group", { spaceId: 1, boardId: 2, itemGroupId: 4, body: { title: "Group", ranking: "m", color: "#123456" } }],
    ["plaky_delete_item_group", { spaceId: 1, boardId: 2, itemGroupId: 4 }],
    ["plaky_archive_item_group", { spaceId: 1, boardId: 2, itemGroupId: 4 }],
    ["plaky_upload_item_file", { spaceId: 1, boardId: 2, itemId: 3, fileBase64: "aGk=", fileName: "note.txt" }],
    ["plaky_update_item_file", { spaceId: 1, boardId: 2, itemId: 3, itemFileId: 5, body: { name: "note.txt" } }],
    ["plaky_delete_item_file", { spaceId: 1, boardId: 2, itemId: 3, itemFileId: 5 }],
  ];
  const previousFetch = globalThis.fetch;
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["read", "write", "destructive"], serverURL: "https://example.test" });
  try {
    for (const [name, arguments_] of mutationCases) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        throw new TypeError("synthetic transport failure");
      };
      const response = await client.callTool({ name, arguments: arguments_ });
      assert.equal(response.isError, true, `${name} should fail in-band`);
      const error = response.structuredContent.error;
      assert.equal(error.retryable, false, `${name} must not be retryable after request start`);
      assert.equal(error.attempted, true, `${name} must record an attempt`);
      assert.equal(error.mayHaveCommitted, true, `${name} must retain ambiguity`);
      assert.equal(error.receipts.length, 1, `${name} must retain one receipt`);
      assert.equal(error.receipts[0].status, "ambiguous", `${name} must classify transport uncertainty`);
      assert.equal(calls, 1, `${name} must make one transport call`);
    }
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("generated mutation response failures remain ambiguous after headers and validation", async () => {
  const previousFetch = globalThis.fetch;
  const { client, server } = await connectedPair({ mode: "generated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const cases = [
      ["HTTP failure", async () => Response.json({ message: "server failure" }, { status: 500 }), "api"],
      ["decode failure", async () => new Response("{", { status: 200, headers: { "content-type": "application/json" } }), "decode"],
      ["success validation failure", async () => Response.json({ title: "missing id" }, { status: 201 }), "plaky"],
    ];
    for (const [label, responseFactory, category] of cases) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return responseFactory();
      };
      const response = await client.callTool({
        name: "plaky_create_item",
        arguments: { spaceId: 1, boardId: 2, body: {} },
      });
      assert.equal(response.isError, true, label);
      const error = response.structuredContent.error;
      assert.equal(error.category, category, label);
      assert.equal(error.retryable, false, label);
      assert.equal(error.attempted, true, label);
      assert.equal(error.mayHaveCommitted, true, label);
      assert.equal(error.receipts[0].status, "ambiguous", label);
      assert.equal(calls, 1, label);
    }
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("direct item and comment workflows forward the MCP cancellation signal", async () => {
  const signals = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    if ((init?.method ?? "GET") !== "GET") {
      signals.push(init.signal);
      return Response.json({ id: "9", title: "created" });
    }
    if (path.endsWith("/spaces")) return Response.json({ data: [{ id: "1", title: "Space" }], hasMore: false });
    if (path.endsWith("/boards")) return Response.json({ data: [{ id: "2", title: "Board" }], hasMore: false });
    if (path.endsWith("/items")) return Response.json({ data: [{ id: "3", title: "Item" }], hasMore: false });
    throw new Error(`unexpected cancellation path: ${path}`);
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    for (const arguments_ of [
      { workflowId: "items.create", input: { spaceId: "Space", boardId: "Board", body: { title: "New" } }, dryRun: false },
      { workflowId: "comments.add", input: { spaceId: "Space", boardId: "Board", itemId: "Item", text: "Note" }, dryRun: false },
    ]) {
      const response = await client.callTool({ name: "plaky_execute_mutation_workflow", arguments: arguments_ });
      assert.notEqual(response.isError, true, `${arguments_.workflowId}: ${response.content[0].text}`);
    }
    assert.equal(signals.length, 2);
    assert.ok(signals.every((signal) => signal instanceof AbortSignal));
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("workflow schemas reject conflicting compatibility aliases before fetch", async () => {
  let fetchCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalls++; throw new Error("conflicting aliases must not fetch"); };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const response = await client.callTool({
      name: "plaky_execute_mutation_workflow",
      arguments: { workflowId: "items.create", input: { space: "One", spaceId: "Two", boardId: "Board", body: {} } },
    });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /conflicting inputs/i);
    assert.equal(fetchCalls, 0);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("workflow schemas reject missing IDs/body/query, wrong types, and unknown fields before fetch", async () => {
  let fetchCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("invalid workflow must not fetch");
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const invalid = [
      ["plaky_execute_read_workflow", { workflowId: "items.search", input: { boardId: 2, query: "x" } }],
      ["plaky_execute_read_workflow", { workflowId: "items.search", input: { spaceId: 1, boardId: 2 } }],
      ["plaky_execute_read_workflow", { workflowId: "comments.thread", input: { spaceId: 1, boardId: 2, itemId: false } }],
      ["plaky_execute_mutation_workflow", { workflowId: "items.create", input: { spaceId: 1, boardId: 2 } }],
      ["plaky_execute_mutation_workflow", { workflowId: "comments.add", input: { spaceId: 1, boardId: 2, itemId: 3, text: "x", extra: true } }],
      ["plaky_execute_mutation_workflow", { workflowId: "items.create", input: { spaceId: 1, boardId: 2, itemId: 3, body: {} } }],
    ];
    for (const [name, args] of invalid) {
      const response = await client.callTool({ name, arguments: args });
      assert.equal(response.isError, true, `${name} should reject ${JSON.stringify(args)}`);
    }
    assert.equal(fetchCalls, 0);
  } finally {
    await server.close();
    globalThis.fetch = previousFetch;
  }
});

test("plan mutation accepts only mutation workflow IDs", async () => {
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read"] });
  try {
    const response = await client.callTool({ name: "plaky_plan_mutation", arguments: { workflowId: "workspace.map", input: {} } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /workflowId|invalid/i);
  } finally {
    await server.close();
  }
});
