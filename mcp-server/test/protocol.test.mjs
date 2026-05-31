import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../esm/server/index.js";

async function connectedPair() {
  const { server } = buildServer({
    apiKey: "plk_test",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  });
  const client = new Client({ name: "plaky115-test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, server };
}

test("unknown tool calls are rejected with an MCP request error", async () => {
  const { client, server } = await connectedPair();
  try {
    await assert.rejects(
      client.callTool({ name: "plaky_missing_tool", arguments: {} }),
      /not found/i,
    );
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
