import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DEFAULT_COMMAND_TIMEOUT_MS = 180_000;
export const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

const SECRET_ENV_NAMES = [
  "PLAKY115_API_KEY",
  "PLAKY115_API_KEY_AUTH",
  "NPM_TOKEN",
  "NODE_AUTH_TOKEN",
  "GITHUB_TOKEN",
  "GITHUB_PAT",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
];

export class VerificationCommandError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "VerificationCommandError";
    Object.assign(this, details);
  }
}

export class VerificationStateError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "VerificationStateError";
    Object.assign(this, details);
  }
}

export function sanitizedEnvironment(environment = process.env) {
  const result = { ...environment };
  for (const name of SECRET_ENV_NAMES) delete result[name];
  return result;
}

export function commandText(command, args = []) {
  return [command, ...args].map((value) => {
    const text = String(value);
    return /^[A-Za-z0-9_./:=+-]+$/.test(text) ? text : JSON.stringify(text);
  }).join(" ");
}

export function runBoundedCommand(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    env = sanitizedEnvironment(),
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    signal,
    label = commandText(command, args),
  } = options;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new VerificationCommandError(`${label} aborted before start`, {
        command,
        args,
        cwd,
        reason: "aborted",
      }));
      return;
    }

    let child;
    try {
      child = spawn(command, args, {
        cwd,
        env,
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      reject(new VerificationCommandError(`${label} could not start`, {
        command,
        args,
        cwd,
        reason: "spawn",
        cause: error,
      }));
      return;
    }

    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let totalBytes = 0;
    let failureReason;
    let settled = false;
    let timer;
    let killTimer;

    const append = (stream, chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      totalBytes += buffer.byteLength;
      if (totalBytes > maxOutputBytes) {
        failureReason ??= "output-limit";
        terminate();
        return;
      }
      if (stream === "stdout") stdout = Buffer.concat([stdout, buffer]);
      else stderr = Buffer.concat([stderr, buffer]);
    };

    const abort = () => {
      failureReason ??= "aborted";
      terminate();
    };

    const clear = () => {
      if (timer !== undefined) clearTimeout(timer);
      if (killTimer !== undefined) clearTimeout(killTimer);
      signal?.removeEventListener("abort", abort);
    };

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clear();
      if (error !== undefined) reject(error);
      else resolve({
        status: child.exitCode,
        signal: child.signalCode,
        stdout: stdout.toString("utf8"),
        stderr: stderr.toString("utf8"),
        outputBytes: totalBytes,
      });
    };

    const terminate = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (process.platform !== "win32" && child.pid !== undefined) {
        try { process.kill(-child.pid, "SIGTERM"); } catch { /* already exited */ }
      }
      try { child.kill("SIGTERM"); } catch { /* already exited */ }
      killTimer ??= setTimeout(() => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        if (process.platform !== "win32" && child.pid !== undefined) {
          try { process.kill(-child.pid, "SIGKILL"); } catch { /* already exited */ }
        }
        try { child.kill("SIGKILL"); } catch { /* already exited */ }
      }, 1_000);
      killTimer.unref?.();
    };

    child.stdout.on("data", (chunk) => append("stdout", chunk));
    child.stderr.on("data", (chunk) => append("stderr", chunk));
    child.once("error", (error) => {
      failureReason ??= "spawn";
      finish(new VerificationCommandError(`${label} could not start`, {
        command,
        args,
        cwd,
        reason: failureReason,
        cause: error,
      }));
    });
    child.once("close", (status, signalName) => {
      if (failureReason !== undefined) {
        finish(new VerificationCommandError(`${label} failed (${failureReason})`, {
          command,
          args,
          cwd,
          reason: failureReason,
          status,
          signal: signalName,
          stdout: stdout.toString("utf8"),
          stderr: stderr.toString("utf8"),
          outputBytes: totalBytes,
        }));
        return;
      }
      if (status !== 0) {
        finish(new VerificationCommandError(`${label} exited with status ${status ?? "unknown"}`, {
          command,
          args,
          cwd,
          reason: "exit",
          status,
          signal: signalName,
          stdout: stdout.toString("utf8"),
          stderr: stderr.toString("utf8"),
          outputBytes: totalBytes,
        }));
        return;
      }
      finish();
    });

    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(() => {
      failureReason ??= "timeout";
      terminate();
    }, timeoutMs);
    timer.unref?.();
  });
}

export async function withOwnedTempDirectory(prefix, callback, options = {}) {
  const parent = options.parent ?? tmpdir();
  const directory = await mkdtemp(join(parent, prefix));
  let callbackError;
  try {
    return await callback(directory);
  } catch (error) {
    callbackError = error;
    throw error;
  } finally {
    try {
      await rm(directory, { recursive: true, force: true });
    } catch (cleanupError) {
      if (callbackError !== undefined) throw new AggregateError([callbackError, cleanupError], "verification temporary directory cleanup failed");
      throw cleanupError;
    }
  }
}

export async function linkPackageDependencies(sourceRoot, worktreeRoot) {
  for (const packageName of ["sdk", "mcp-server"]) {
    const source = join(sourceRoot, packageName, "node_modules");
    const target = join(worktreeRoot, packageName, "node_modules");
    if (!existsSync(source)) {
      throw new VerificationStateError(`missing ${source}; run npm --prefix ${packageName} ci before npm run verify`);
    }
    await symlink(source, target, process.platform === "win32" ? "junction" : "dir");
  }
}

export async function withOwnedWorktree(sourceRoot, callback, options = {}) {
  const environment = options.env ?? sanitizedEnvironment();
  const status = await runBoundedCommand("git", ["status", "--porcelain=v1", "--untracked-files=no"], {
    cwd: sourceRoot,
    env: environment,
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    maxOutputBytes: 64 * 1024,
  });
  if (status.stdout.trim() !== "") {
    throw new VerificationStateError("npm run verify requires a clean tracked worktree; commit or stash tracked changes first", {
      status: status.stdout,
    });
  }

  return withOwnedTempDirectory("plaky115-verify-", async (parent) => {
    const worktreeRoot = join(parent, "checkout");
    let added = false;
    let callbackError;
    try {
      await runBoundedCommand("git", ["worktree", "add", "--detach", "--quiet", worktreeRoot, "HEAD"], {
        cwd: sourceRoot,
        env: environment,
        signal: options.signal,
        timeoutMs: options.timeoutMs,
        maxOutputBytes: 64 * 1024,
      });
      added = true;
      await linkPackageDependencies(sourceRoot, worktreeRoot);
      return await callback(worktreeRoot);
    } catch (error) {
      callbackError = error;
      throw error;
    } finally {
      if (added) {
        try {
          await runBoundedCommand("git", ["worktree", "remove", "--force", "--quiet", worktreeRoot], {
            cwd: sourceRoot,
            env: environment,
            timeoutMs: options.cleanupTimeoutMs ?? 30_000,
            maxOutputBytes: 64 * 1024,
          });
        } catch (cleanupError) {
          if (callbackError !== undefined) throw new AggregateError([callbackError, cleanupError], "verification worktree cleanup failed");
          throw cleanupError;
        }
      }
    }
  }, options);
}
