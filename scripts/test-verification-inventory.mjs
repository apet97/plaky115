import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));

test("verify accounts for every tracked scripts/test-*.mjs file", () => {
  const tracked = execFileSync("git", ["ls-files", "scripts/test-*.mjs"], {
    cwd: root,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean).sort();
  const reachable = collectReachableScripts(pkg.scripts, "verify");
  const commands = [...reachable].map((name) => pkg.scripts[name]).join("\n");
  const missing = tracked.filter((path) => !commands.includes(path));

  assert.deepEqual(missing, [], `tracked verification tests missing from npm run verify: ${missing.join(", ")}`);
});

function collectReachableScripts(scripts, entrypoint) {
  const visited = new Set();
  const pending = [entrypoint];
  while (pending.length > 0) {
    const name = pending.pop();
    if (visited.has(name)) continue;
    assert.equal(typeof scripts[name], "string", `missing package script ${name}`);
    visited.add(name);
    for (const match of scripts[name].matchAll(/\bnpm run ([\w:-]+)/g)) {
      pending.push(match[1]);
    }
  }
  return visited;
}
