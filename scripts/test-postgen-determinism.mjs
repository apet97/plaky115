import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("postgen-dx is idempotent", () => {
  spawnSync("node", ["scripts/postgen-dx.mjs"], { cwd: root });
  const a = readFileSync(`${root}/sdk/package.json`, "utf8") + readFileSync(`${root}/mcp-server/package.json`, "utf8");
  spawnSync("node", ["scripts/postgen-dx.mjs"], { cwd: root });
  const b = readFileSync(`${root}/sdk/package.json`, "utf8") + readFileSync(`${root}/mcp-server/package.json`, "utf8");
  assert.equal(a, b);
});
