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
    assert.equal(tools.length, 37);
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
