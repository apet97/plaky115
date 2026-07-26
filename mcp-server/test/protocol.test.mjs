import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../esm/server/index.js";

async function connectedPair(options = {}) {
  const { server } = buildServer({
    apiKey: "plk_test",
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
    assert.equal(response.structuredContent.error.name, "PlakyNotFoundError");
    assert.equal(response.structuredContent.error.status, 404);
    assert.equal(response.structuredContent.error.requestId, "req_public");
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

test("invalid known-tool arguments remain in-band tool errors", async () => {
  const { client, server } = await connectedPair();
  try {
    const response = await client.callTool({ name: "plaky_search_docs", arguments: {} });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /query/i);
  } finally {
    await server.close();
  }
});

test("missing required body surfaces as an in-band tool error over the protocol", async () => {
  const { client, server } = await connectedPair();
  try {
    const response = await client.callTool({ name: "plaky_create_item", arguments: { spaceId: 1, boardId: 2 } });
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /body/i);
  } finally {
    await server.close();
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
    if (path.endsWith("/comments")) return new Response("[]", { headers: { "content-type": "application/json" } });
    if (path.endsWith("/items")) return new Response(JSON.stringify({ data: [], hasMore: false }), { headers: { "content-type": "application/json" } });
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

test("every mutation workflow and mutation plan accepts exact valid input without writing by default", async () => {
  let fetchCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("dry-run workflow must not fetch");
  };
  const { client, server } = await connectedPair({ mode: "curated", scopes: ["read", "write"], serverURL: "https://example.test" });
  try {
    const inputs = [
      { workflowId: "items.create", input: { spaceId: 1, boardId: 2, body: { title: "New" } } },
      { workflowId: "items.updateFields", input: { spaceId: 1, boardId: 2, updates: [{ itemId: 3, body: { Status: "Done" } }] } },
      { workflowId: "comments.add", input: { spaceId: 1, boardId: 2, itemId: 3, text: "Note" } },
    ];
    for (const args of inputs) {
      const executed = await client.callTool({ name: "plaky_execute_mutation_workflow", arguments: args });
      assert.notEqual(executed.isError, true, `${args.workflowId}: ${executed.content[0].text}`);
      assert.equal(executed.structuredContent.dryRun, true);
      const planned = await client.callTool({ name: "plaky_plan_mutation", arguments: args });
      assert.notEqual(planned.isError, true, `${args.workflowId}: ${planned.content[0].text}`);
      assert.equal(planned.structuredContent.dryRun, true);
    }
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
