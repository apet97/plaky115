#!/usr/bin/env node
import { mkdir, readFile, rm } from "node:fs/promises";
import { platform, release } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { verificationPlan } from "./lib/verification-plan.mjs";
import {
  commandText,
  runBoundedCommand,
  sanitizedEnvironment,
  VerificationCommandError,
  VerificationStateError,
  withOwnedWorktree,
} from "./lib/verification-runner.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const CLI_BINARY_TOKEN = "{cliBinary}";

export async function runVerification(options = {}) {
  const sourceRoot = options.sourceRoot ?? root;
  const signal = options.signal;
  const report = {
    schemaVersion: 1,
    status: "running",
    commit: "unknown",
    platform: `${platform()}-${process.arch}`,
    osRelease: release(),
    versions: {},
    actionVersions: {},
    worktree: "owned temporary detached checkout",
    gates: [],
  };

  try {
    report.commit = await readGitValue(sourceRoot, ["rev-parse", "HEAD"], signal);
    report.actionVersions = await readActionVersions(sourceRoot);
    return await withOwnedWorktree(sourceRoot, async (worktreeRoot) => {
      report.versions = await resolveToolVersions(worktreeRoot, signal);
      const verificationRoot = join(worktreeRoot, ".verification");
      await mkdir(verificationRoot, { recursive: true });
      const cliBinary = join(verificationRoot, process.platform === "win32" ? "plaky115.exe" : "plaky115");

      for (const gate of verificationPlan) {
        await runGate(gate, { worktreeRoot, cliBinary, signal, report });
      }

      await rm(verificationRoot, { recursive: true, force: true });
      await assertWorktreeClean(worktreeRoot, signal);
      report.status = "passed";
      return report;
    }, { signal });
  } catch (error) {
    report.status = "failed";
    report.error = serializeError(error);
    if (error instanceof VerificationCommandError) {
      report.failedCommand = commandText(error.command, error.args);
    }
    error.report = report;
    throw error;
  }
}

async function runGate(gate, context) {
  const command = gate.kind === "npm-script" ? npmCommand() : resolveToken(gate.command, context.cliBinary);
  const args = gate.kind === "npm-script"
    ? ["run", gate.script]
    : gate.args.map((value) => resolveToken(value, context.cliBinary));
  const cwd = gate.cwd === undefined ? context.worktreeRoot : join(context.worktreeRoot, gate.cwd);
  const env = {
    ...sanitizedEnvironment(),
    ...(gate.env ?? {}),
  };
  const started = Date.now();
  const record = {
    id: gate.id,
    phase: gate.phase,
    command: commandText(command, args).replaceAll(context.worktreeRoot, "<owned-worktree>"),
    status: "running",
  };
  context.report.gates.push(record);
  process.stdout.write(`\n[verify] ${record.id}: ${record.command}\n`);
  try {
    const result = await runBoundedCommand(command, args, {
      cwd,
      env,
      signal: context.signal,
      label: record.command,
    });
    writeOutput(result);
    record.status = "passed";
    record.durationMs = Date.now() - started;
  } catch (error) {
    if (error instanceof VerificationCommandError) {
      writeOutput(error);
      record.status = "failed";
      record.durationMs = Date.now() - started;
    }
    throw error;
  }
}

function writeOutput(result) {
  if (result?.stdout) process.stdout.write(result.stdout);
  if (result?.stderr) process.stderr.write(result.stderr);
}

function resolveToken(value, cliBinary) {
  return String(value).replaceAll(CLI_BINARY_TOKEN, cliBinary);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function assertWorktreeClean(worktreeRoot, signal) {
  const result = await runBoundedCommand("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
    cwd: worktreeRoot,
    signal,
    timeoutMs: 30_000,
    maxOutputBytes: 256 * 1024,
  });
  if (result.stdout.trim() !== "") {
    throw new VerificationStateError(`verification left the owned checkout dirty:\n${result.stdout}`);
  }
}

async function readGitValue(cwd, args, signal) {
  const result = await runBoundedCommand("git", args, {
    cwd,
    signal,
    timeoutMs: 30_000,
    maxOutputBytes: 64 * 1024,
  });
  return result.stdout.trim();
}

async function resolveToolVersions(cwd, signal) {
  const commands = [
    ["node", ["--version"]],
    [npmCommand(), ["--version"]],
    ["ruby", ["--version"]],
    ["go", ["version"], { env: { GOTOOLCHAIN: "go1.26.5" } }],
    ["bun", ["--version"]],
    ["goreleaser", ["--version"]],
  ];
  const versions = {};
  for (const [command, args, options] of commands) {
    const result = await runBoundedCommand(command, args, {
      cwd,
      env: { ...sanitizedEnvironment(), ...(options?.env ?? {}) },
      timeoutMs: 30_000,
      maxOutputBytes: 64 * 1024,
    });
    versions[command === "npm.cmd" ? "npm" : command] = firstVersionLine(result.stdout);
  }
  return versions;
}

function firstVersionLine(output) {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const goreleaser = lines.find((line) => line.startsWith("GitVersion:"));
  return (goreleaser ?? lines[0] ?? "unknown").slice(0, 200);
}

async function readActionVersions(sourceRoot) {
  const workflowDir = join(sourceRoot, ".github", "workflows");
  const entries = {};
  const names = ["ci.yml", "live-read.yml", "live.yml", "openapi-freshness.yml", "release-cli.yml", "release-npm.yml"];
  for (const name of names) {
    let source;
    try {
      source = await readFile(join(workflowDir, name), "utf8");
    } catch {
      continue;
    }
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/\buses:\s*([^\s#]+)\s+#\s+(v\d+\.\d+\.\d+)\s*$/);
      if (!match) continue;
      const [repository, sha] = match[1].split("@");
      entries[repository] ??= { sha, version: match[2] };
    }
  }
  return entries;
}

function serializeError(error) {
  if (!(error instanceof Error)) return { message: String(error) };
  const result = { name: error.name, message: error.message };
  for (const key of ["reason", "status", "signal", "outputBytes"]) {
    if (error[key] !== undefined) result[key] = error[key];
  }
  if (error.stdout) result.stdout = error.stdout.slice(-8_192);
  if (error.stderr) result.stderr = error.stderr.slice(-8_192);
  return result;
}

function invokedDirectly() {
  return process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
}

if (invokedDirectly()) {
  const controller = new AbortController();
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    controller.abort();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const report = await runVerification({ signal: controller.signal });
    process.stdout.write(`\n${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    const report = error?.report ?? { schemaVersion: 1, status: "failed", error: serializeError(error) };
    process.stderr.write(`\n${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = stopping ? 130 : 1;
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  }
}
