import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const liveSweep = readFileSync(fileURLToPath(new URL("live-workspace-sweep.mjs", import.meta.url)), "utf8");

test("live sweep fails enabled SDK CLI and MCP sections instead of skipping missing builds", () => {
  assert.doesNotMatch(liveSweep, /record\("sdk", "skipped — sdk build missing/);
  assert.doesNotMatch(liveSweep, /record\("cli", "skipped — could not build CLI/);
  assert.doesNotMatch(liveSweep, /record\("mcp", "skipped — bin\/mcp-server\.js missing/);
  assert.match(liveSweep, /throw new Error\("SDK build missing/);
  assert.match(liveSweep, /throw new Error\("CLI build failed/);
  assert.match(liveSweep, /throw new Error\("MCP server bin missing/);
});

test("live sweep cleanup fails when smoke leftovers remain", () => {
  assert.match(liveSweep, /if \(leftoverCount > 0\)/);
  assert.match(liveSweep, /throw new Error\(`live sweep cleanup left \$\{leftoverCount\} smoke item/);
  assert.match(liveSweep, /throw new Error\(`live sweep cleanup leftover scan failed:/);
  assert.doesNotMatch(liveSweep, /leftover scan failed"[\s\S]*return 0;/);
});

test("live sweep fails when CLI probes fail and always rebuilds the CLI", () => {
  assert.doesNotMatch(liveSweep, /if \(existsSync\(bin\)\) return bin;/);
  assert.match(liveSweep, /throw new Error\(`CLI \$\{args\.join\(" "\)\} failed:/);
  assert.match(liveSweep, /throw new Error\("CLI workflow probes require a smoke item created by the API or SDK sweep"\)/);
  assert.match(liveSweep, /record\("cli", "comments-thread", runCLI/);
  assert.match(liveSweep, /record\("cli", "reactions-replace --dry-run", runCLI/);
});

test("live sweep reads structured MCP responses before text JSON fallback", () => {
  assert.match(liveSweep, /if \(response\.structuredContent\) return response\.structuredContent;/);
  assert.match(liveSweep, /Array\.isArray\(docs\?\.hits\) \? docs\.hits\.length : undefined/);
});
