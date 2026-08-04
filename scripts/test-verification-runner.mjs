import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  runBoundedCommand,
  VerificationCommandError,
  VerificationStateError,
  withOwnedTempDirectory,
  withOwnedWorktree,
} from "./lib/verification-runner.mjs";

test("owned temporary roots remain distinct under concurrent allocation", async () => {
  const roots = [];
  await Promise.all([
    withOwnedTempDirectory("plaky115-runner-collision-", async (root) => {
      roots.push(root);
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(existsSync(root), true);
    }),
    withOwnedTempDirectory("plaky115-runner-collision-", async (root) => {
      roots.push(root);
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(existsSync(root), true);
    }),
  ]);
  assert.equal(roots.length, 2);
  assert.notEqual(roots[0], roots[1]);
  assert.equal(roots.every((root) => !existsSync(root)), true);
});

test("command failures clean the owned root and preserve bounded diagnostics", async () => {
  let root;
  await assert.rejects(
    withOwnedTempDirectory("plaky115-runner-failure-", async (directory) => {
      root = directory;
      await writeFile(join(directory, "fixture.txt"), "fixture\n");
      await runBoundedCommand(process.execPath, ["-e", "process.stderr.write('failure'); process.exit(7)"], {
        cwd: directory,
        timeoutMs: 5_000,
        maxOutputBytes: 128,
      });
    }),
    (error) => {
      assert.ok(error instanceof VerificationCommandError);
      assert.equal(error.reason, "exit");
      assert.equal(error.status, 7);
      assert.equal(error.stderr, "failure");
      return true;
    },
  );
  assert.equal(existsSync(root), false);
});

test("timeouts and aborts terminate children and clean temporary roots", async () => {
  let timeoutRoot;
  await assert.rejects(
    withOwnedTempDirectory("plaky115-runner-timeout-", async (directory) => {
      timeoutRoot = directory;
      await runBoundedCommand(process.execPath, ["-e", "setTimeout(() => {}, 10_000)"], {
        cwd: directory,
        timeoutMs: 50,
      });
    }),
    (error) => error instanceof VerificationCommandError && error.reason === "timeout",
  );
  assert.equal(existsSync(timeoutRoot), false);

  let abortRoot;
  const controller = new AbortController();
  const promise = withOwnedTempDirectory("plaky115-runner-abort-", async (directory) => {
    abortRoot = directory;
    const command = runBoundedCommand(process.execPath, ["-e", "setTimeout(() => {}, 10_000)"], {
      cwd: directory,
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    setTimeout(() => controller.abort(), 25).unref();
    await command;
  });
  await assert.rejects(promise, (error) => error instanceof VerificationCommandError && error.reason === "aborted");
  assert.equal(existsSync(abortRoot), false);
});

test("output limits fail closed before unbounded capture", async () => {
  await assert.rejects(
    runBoundedCommand(process.execPath, ["-e", "process.stdout.write('x'.repeat(1024))"], {
      maxOutputBytes: 64,
      timeoutMs: 5_000,
    }),
    (error) => error instanceof VerificationCommandError && error.reason === "output-limit",
  );
});

test("dirty caller worktrees are rejected without creating a temporary checkout", async () => {
  const repo = await mkdtemp("plaky115-runner-dirty-");
  try {
    execFileSync("git", ["init", "--quiet", "-b", "main"], { cwd: repo });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: repo });
    execFileSync("git", ["config", "user.name", "Verification Test"], { cwd: repo });
    await writeFile(join(repo, "tracked.txt"), "base\n");
    execFileSync("git", ["add", "tracked.txt"], { cwd: repo });
    execFileSync("git", ["commit", "--quiet", "-m", "fixture"], { cwd: repo });
    await writeFile(join(repo, "tracked.txt"), "dirty\n");
    const before = readFileSync(join(repo, "tracked.txt"), "utf8");

    await assert.rejects(
      withOwnedWorktree(repo, async () => { throw new Error("must not run"); }),
      (error) => error instanceof VerificationStateError,
    );
    assert.equal(readFileSync(join(repo, "tracked.txt"), "utf8"), before);
    const worktrees = execFileSync("git", ["worktree", "list", "--porcelain"], { cwd: repo, encoding: "utf8" })
      .split(/\r?\n/)
      .filter((line) => line.startsWith("worktree "));
    assert.equal(worktrees.length, 1);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
