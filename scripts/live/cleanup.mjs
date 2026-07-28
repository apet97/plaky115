import { createMutationAttemptLedger } from "./mutation-budget.mjs";

export function createCleanupCoordinator(cleanupFn) {
  let promise;
  return () => (promise ??= Promise.resolve().then(cleanupFn));
}

export function createShutdownCoordinator({ cleanup, exit, onError = () => {} }) {
  let promise;
  return (code) => (promise ??= (async () => {
    let exitCode = code;
    try { await cleanup(); } catch (error) { exitCode = 1; onError(error); }
    exit(exitCode);
  })());
}

export async function executeWithCleanup(operation, cleanup) {
  let operationError;
  try { await operation(); } catch (error) { operationError = error; }
  let cleanupError;
  try { await cleanup(); } catch (error) { cleanupError = error; }
  if (operationError && cleanupError) throw new AggregateError([operationError, cleanupError], "live operation and cleanup failed");
  if (operationError) throw operationError;
  if (cleanupError) throw cleanupError;
}

export function isOwnedArtifact(artifact, marker) {
  if (!artifact || typeof artifact !== "object") return false;
  return [artifact.title, artifact.name, artifact.description, artifact.content, artifact.text]
    .some((value) => typeof value === "string" && value.startsWith(marker));
}

export async function collectPages(fetchPage, { maxPages = 10_000 } = {}) {
  if (!Number.isSafeInteger(maxPages) || maxPages <= 0) throw new RangeError("maxPages must be a positive safe integer");
  const records = [];
  for (let page = 1; page <= maxPages; page++) {
    const response = await fetchPage(page);
    records.push(...(Array.isArray(response?.data) ? response.data : []));
    if (response?.hasMore !== true) return records;
  }
  throw new Error(`cleanup pagination exceeded ${maxPages} pages`);
}

export async function verifyDeleteOutcome(remove, isAbsent) {
  try { return await remove(); } catch (error) {
    if (error?.status !== 400 || !(await isAbsent())) throw error;
    return undefined;
  }
}

export async function waitForAbsent(isAbsent, { attempts = 20, delayMs = 100 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (await isAbsent()) return true;
    if (attempt < attempts && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

export async function cleanupOwnedArtifacts({ ledger, adapters, attempted = createMutationAttemptLedger() }) {
  const order = ["comments", "files", "items", "groups"];
  const failures = [];
  const discovered = { comments: 0, files: 0, items: 0, groups: 0 };
  const leftovers = { comments: 0, files: 0, items: 0, groups: 0 };
  async function attempt(family, artifact, stage) {
    const artifactId = String(artifact.id ?? "unknown");
    if (attempted[family].has(artifactId)) return;
    attempted[family].add(artifactId);
    try {
      await adapters[family].remove(artifact);
      const index = ledger[family].findIndex((entry) => String(entry.id) === String(artifact.id));
      if (index >= 0) ledger[family].splice(index, 1);
    } catch (error) {
      if (isCleanupNotFound(error)) {
        const index = ledger[family].findIndex((entry) => String(entry.id) === String(artifact.id));
        if (index >= 0) ledger[family].splice(index, 1);
        return;
      }
      failures.push(new Error(`${stage} ${family} ${String(artifact.id ?? "unknown")} failed`, { cause: error }));
    }
  }
  for (const family of order) for (const artifact of [...ledger[family]].reverse()) await attempt(family, artifact, "known cleanup");
  for (const family of order) {
    let records = [];
    try { records = await adapters[family].list(); } catch (error) { failures.push(new Error(`discovery scan ${family} failed`, { cause: error })); continue; }
    for (const artifact of records.filter((entry) => isOwnedArtifact(entry, ledger.marker))) { discovered[family]++; await attempt(family, artifact, "discovered cleanup"); }
  }
  for (const family of order) {
    try {
      const owned = (await adapters[family].list()).filter((entry) => isOwnedArtifact(entry, ledger.marker));
      leftovers[family] = owned.length;
      if (owned.length > 0) failures.push(new Error(`final rescan found ${owned.length} ${family}`));
    } catch (error) { failures.push(new Error(`final rescan ${family} failed`, { cause: error })); }
  }
  if (failures.length > 0) throw new AggregateError(failures, "live sweep cleanup failed");
  return { discovered, leftovers };
}

export function isCleanupNotFound(error) {
  for (let current = error; current && typeof current === "object"; current = current.cause) {
    if (current.status === 404 || current.statusCode === 404) return true;
  }
  return false;
}
