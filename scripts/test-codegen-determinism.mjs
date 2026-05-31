import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function snapshot(paths) {
  return paths.map((p) => (existsSync(p) ? readFileSync(p, "utf8") : "")).join("\n---\n");
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${result.stderr ?? ""}`);
  }
}

test("generate-types is deterministic", () => {
  const target = join(root, "sdk/src/generated/types.ts");
  run("node", ["scripts/generate-types.mjs"]);
  const a = snapshot([target]);
  run("node", ["scripts/generate-types.mjs"]);
  const b = snapshot([target]);
  assert.equal(a, b, "running generate-types twice must produce identical output");
});

test("generate-mcp is deterministic", () => {
  run("node", ["scripts/generate-mcp.mjs"]);
  const targets = [
    join(root, "mcp-server/src/tools/raw/list-spaces.ts"),
    join(root, "mcp-server/src/tools/raw/replace-comment-reactions.ts"),
    join(root, "mcp-server/src/tools/raw/index.ts"),
  ];
  const a = snapshot(targets);
  run("node", ["scripts/generate-mcp.mjs"]);
  const b = snapshot(targets);
  assert.equal(a, b);
});

test("generate-cli is deterministic", () => {
  run("node", ["scripts/generate-cli.mjs"]);
  const targets = [
    join(root, "cli/internal/cli/raw/list-spaces.go"),
    join(root, "cli/internal/cli/raw/create-item.go"),
    join(root, "cli/internal/cli/raw/create-item-comment.go"),
    join(root, "cli/internal/cli/raw/replace-comment-reactions.go"),
    join(root, "cli/internal/cli/raw/update-item-comment.go"),
    join(root, "cli/internal/cli/raw/update-item-field.go"),
    join(root, "cli/internal/cli/raw/update-item-fields.go"),
    join(root, "cli/internal/cli/raw/raw.go"),
    join(root, "cli/internal/plakysdk/operations.go"),
  ];
  const a = snapshot(targets);
  run("node", ["scripts/generate-cli.mjs"]);
  const b = snapshot(targets);
  assert.equal(a, b);
  const operations = readFileSync(join(root, "cli/internal/plakysdk/operations.go"), "utf8");
  assert.match(operations, /url\.PathEscape\(opts\.SpaceId\)/);
  assert.match(operations, /url\.PathEscape\(opts\.BoardId\)/);
  assert.match(operations, /IdempotencyKey string/);
  assert.doesNotMatch(operations, /"\{spaceId\}", opts\.SpaceId\)/);
  const createItem = readFileSync(join(root, "cli/internal/cli/raw/create-item.go"), "utf8");
  assert.match(createItem, /"idempotency-key"/);
  assert.match(createItem, /@- for stdin/);
  assert.match(createItem, /Plaky space ID/);
  assert.match(createItem, /Plaky board ID/);
  assert.match(createItem, /Request body JSON, @file\.json, or @- for stdin \(required\)/);
  assert.doesNotMatch(createItem, /"spaceId \(required\)"/);
  assert.doesNotMatch(createItem, /"boardId \(required\)"/);
  const deleteItem = readFileSync(join(root, "cli/internal/cli/raw/delete-item.go"), "utf8");
  assert.match(deleteItem, /cmd\.Flags\(\)\.Bool\("confirm"/);
  assert.match(deleteItem, /required for destructive raw DELETE operations/);
});

test("generate-docs-index is deterministic", () => {
  run("node", ["scripts/generate-docs-index.mjs"]);
  const target = join(root, "mcp-server/src/runtime/docs-index.ts");
  const a = snapshot([target]);
  run("node", ["scripts/generate-docs-index.mjs"]);
  const b = snapshot([target]);
  assert.equal(a, b);
});
