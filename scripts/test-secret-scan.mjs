import assert from "node:assert/strict";
import { chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const scanner = fileURLToPath(new URL("secret-scan.mjs", import.meta.url));
const token = (tail) => ["pl", "k_", tail].join("");
const corpus = JSON.parse(
  await readFile(fileURLToPath(new URL("../test/fixtures/security/plaky-api-key-cases.json", import.meta.url)), "utf8"),
);

function run(root) {
  return spawnSync(process.execPath, [scanner, root], { encoding: "utf8" });
}

async function withTempDir(fn) {
  const root = await mkdtemp(join(tmpdir(), "plaky115-secret-scan-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("scanner reports text matches deterministically without revealing tokens", async () => {
  await withTempDir(async (root) => {
    await mkdir(join(root, ".live-artifacts"));
    await writeFile(join(root, "a-short.txt"), `short ${token("A")}\n`);
    await writeFile(join(root, "b-multiple.txt"), `${token("one")} and ${token("two")}\n`);
    await writeFile(join(root, "c-underscore.txt"), `${token("under_score")}\n`);
    await writeFile(join(root, "d-hyphen.txt"), `${token("with-hyphen")}\n`);
    await writeFile(join(root, ".live-artifacts", "captured.txt"), `${token("artifact")}\n`);

    const result = run(root);
    const output = `${result.stdout}${result.stderr}`;

    assert.equal(result.status, 1);
    assert.deepEqual(output.trim().split("\n"), [
      ".live-artifacts/captured.txt:1: count=1",
      "a-short.txt:1: count=1",
      "b-multiple.txt:1: count=2",
      "c-underscore.txt:1: count=1",
      "d-hyphen.txt:1: count=1",
    ]);
    for (const secret of [token("A"), token("one"), token("two"), token("under_score"), token("with-hyphen"), token("artifact")]) {
      assert.doesNotMatch(output, new RegExp(secret));
    }
  });
});

test("scanner follows every matching and non-matching shared corpus case", async () => {
  await withTempDir(async (root) => {
    const expected = [];
    for (const [index, entry] of corpus.cases.entries()) {
      const name = `case-${String(index).padStart(2, "0")}.txt`;
      await writeFile(join(root, name), entry.inputParts.join(""));
      const count = entry.expectedParts.filter((part) => part === corpus.marker).length;
      if (count > 0) expected.push(`${name}:1: count=${count}`);
    }

    const result = run(root);
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 1);
    assert.deepEqual(output.trim().split("\n"), expected);
    for (const entry of corpus.cases) {
      const value = entry.inputParts.join("");
      if (value.startsWith(token("")) && value.length > token("").length) {
        assert.doesNotMatch(output, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
    }
  });
});

test("scanner skips NUL binary files, explicit build directories, and symlinks", async () => {
  await withTempDir(async (root) => {
    const outside = `${root}-outside.txt`;
    try {
      await writeFile(join(root, "binary.dat"), Buffer.concat([Buffer.from(token("binary")), Buffer.from([0]), Buffer.from("tail")]));
      await mkdir(join(root, "node_modules"));
      await writeFile(join(root, "node_modules", "ignored.txt"), token("dependency"));
      await mkdir(join(root, "dist"));
      await writeFile(join(root, "dist", "ignored.txt"), token("build"));
      await writeFile(outside, token("outside"));
      await symlink(outside, join(root, "linked.txt"));

      const result = run(root);
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
      assert.equal(`${result.stdout}${result.stderr}`, "");
    } finally {
      await rm(outside, { force: true });
    }
  });
});

test("scanner honors Git ignored paths at a repository root", async () => {
  await withTempDir(async (root) => {
    execFileSync("git", ["-C", root, "init", "--quiet"]);
    await writeFile(join(root, ".gitignore"), ".env\nignored.txt\nignored-dir/\n.live-artifacts/\n");
    await writeFile(join(root, "visible.txt"), token("visible"));
    await writeFile(join(root, ".env"), token("environment"));
    await writeFile(join(root, "ignored.txt"), token("ignored"));
    await mkdir(join(root, "ignored-dir"));
    await writeFile(join(root, "ignored-dir", "nested.txt"), token("nested"));
    await mkdir(join(root, ".live-artifacts"));
    await writeFile(join(root, ".live-artifacts", "captured.txt"), token("artifact"));

    const result = run(root);
    const output = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 1);
    assert.equal(output, ".live-artifacts/captured.txt:1: count=1\nvisible.txt:1: count=1\n");
  });
});

test("scanner fails closed on unreadable paths without printing file contents", async () => {
  await withTempDir(async (root) => {
    const path = join(root, "unreadable.txt");
    const secret = token("unreadable");
    await writeFile(path, secret);
    await chmod(path, 0o000);
    try {
      const result = run(root);
      const output = `${result.stdout}${result.stderr}`;
      assert.equal(result.status, 2);
      assert.match(output, /unreadable\.txt/);
      assert.doesNotMatch(output, new RegExp(secret));
    } finally {
      await chmod(path, 0o600);
    }
  });
});

test("scanner rejects an invalid root as a configuration error", () => {
  const missing = join(tmpdir(), `plaky115-secret-scan-missing-${process.pid}`);
  const result = run(missing);
  assert.equal(result.status, 2);
  assert.match(`${result.stdout}${result.stderr}`, /scan root/);
});
