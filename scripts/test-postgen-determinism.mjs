import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

test("postgen-dx is idempotent", () => {
  const outputRoot = mkdtempSync(join(tmpdir(), "plaky115-postgen-test-"));
  try {
    const args = ["scripts/postgen-dx.mjs", "--source-root", root, "--output-root", outputRoot];
    assert.equal(spawnSync(process.execPath, args, { cwd: root }).status, 0);
    const a = readPackages(outputRoot);
    assert.equal(spawnSync(process.execPath, args, { cwd: root }).status, 0);
    const b = readPackages(outputRoot);
    assert.equal(a, b);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});

function readPackages(base) {
  return readFileSync(join(base, "sdk/package.json"), "utf8")
    + readFileSync(join(base, "mcp-server/package.json"), "utf8");
}
