import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));

test("generation writes to an explicit isolated output root", () => {
  const outputRoot = mkdtempSync(join(tmpdir(), "plaky115-generated-drift-"));
  try {
    execFileSync(process.execPath, ["scripts/generate-all.mjs", "--output-root", outputRoot], {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    });

    assert.equal(existsSync(join(outputRoot, "openapi/plaky115-dx.openapi.yaml")), true);
    assert.equal(existsSync(join(outputRoot, "openapi/plaky115-operation-metadata.json")), true);
    assert.equal(existsSync(join(outputRoot, "sdk/src/generated/types.ts")), true);
    assert.equal(existsSync(join(outputRoot, "mcp-server/src/tools/raw/index.ts")), true);
    assert.equal(existsSync(join(outputRoot, "cli/internal/plakysdk/operations.go")), true);
    assert.equal(existsSync(join(outputRoot, "mcp-server/src/runtime/docs-index.ts")), true);
  } finally {
    rmSync(outputRoot, { recursive: true, force: true });
  }
});

test("failed isolated drift generation leaves the caller tracked diff unchanged", () => {
  const sourceRoot = mkdtempSync(join(tmpdir(), "plaky115-generated-failure-"));
  const before = trackedDiff();
  try {
    writeFileSync(join(sourceRoot, "api-1.yaml"), "paths: [\n");
    const result = spawnSync(process.execPath, ["scripts/check-generated-drift.mjs", "--source-root", sourceRoot], {
      cwd: root,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.equal(trackedDiff(), before);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
  }
});

function trackedDiff() {
  return execFileSync("git", ["diff", "--binary"], { cwd: root, encoding: "utf8" });
}
