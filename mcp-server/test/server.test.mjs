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
