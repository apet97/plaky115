#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import {
  access,
  open,
  readFile,
  rename,
  rm,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import {
  assertExpectedOperations,
  validateUpstreamManifestShape,
} from "./check-upstream-manifest.mjs";
import {
  canonicalJson,
  operationInventory,
  parseOpenApiSource,
} from "./lib/openapi-source-parser.mjs";

const JOURNAL_VERSION = 1;
const JOURNAL_NAME = ".contract-acceptance-journal.json";
const SHA256 = /^[a-f0-9]{64}$/;
const JOURNAL_PHASES = new Set([
  "prepared",
  "upstream-backed-up",
  "backups-created",
  "upstream-replaced",
  "manifest-replaced",
  "verified",
  "backups-removed",
]);

export async function acceptOpenApiCandidate(options = {}) {
  if (options.recover) return recoverOpenApiAcceptance(options);
  if (!options.yes) throw new Error("candidate acceptance requires --yes");

  const paths = resolveAcceptancePaths(options);
  await assertJournalAbsent(paths.journalPath);

  const candidateDir = options.candidateDir ?? ".contract-candidate/current";
  const expectedPath = options.expectedPath ?? "openapi/plaky115-expected-operations.json";
  const raw = await readFile(join(candidateDir, "raw-source"));
  const canonical = await readFile(join(candidateDir, "canonical.json"));
  const candidate = await readFile(join(candidateDir, "candidate.yaml"));
  const provenance = JSON.parse(await readFile(join(candidateDir, "provenance.json"), "utf8"));
  validateUpstreamManifestShape(provenance, { accepted: false });
  if (sha256(raw) !== provenance.rawSha256) throw new Error("candidate raw SHA-256 mismatch");
  if (sha256(canonical) !== provenance.canonicalSha256) throw new Error("candidate canonical SHA-256 mismatch");

  const canonicalDocument = await parseOpenApiSource(canonical.toString("utf8"), "application/json");
  const yamlDocument = await parseOpenApiSource(candidate.toString("utf8"), "application/yaml");
  if (canonicalJson(canonicalDocument) !== canonicalJson(yamlDocument)) {
    throw new Error("candidate YAML is not semantically equal to canonical JSON");
  }
  const methodPathKeys = operationInventory(yamlDocument).map(({ method, path }) => `${method} ${path}`).sort();
  if (methodPathKeys.length !== provenance.operationCount
    || JSON.stringify(methodPathKeys) !== JSON.stringify(provenance.methodPathKeys)) {
    throw new Error("candidate provenance operation inventory mismatch");
  }
  await assertExpectedOperations(methodPathKeys, expectedPath);

  const manifest = {
    ...provenance,
    acceptedAt: (options.now ?? (() => new Date()))().toISOString(),
    acceptedSha256: sha256(candidate),
  };
  validateUpstreamManifestShape(manifest, { accepted: true });
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const oldUpstream = await readFile(paths.upstreamPath);
  const oldManifest = await readFile(paths.manifestPath);
  const transaction = createTransaction(paths, {
    oldUpstream: sha256(oldUpstream),
    oldManifest: sha256(oldManifest),
    newUpstream: sha256(candidate),
    newManifest: sha256(manifestBytes),
  });

  let journalPublished = false;
  try {
    await writeSynced(transaction.staged.upstream, candidate);
    await writeSynced(transaction.staged.manifest, manifestBytes);
    await writeJournal(transaction, "prepared", options);
    journalPublished = true;

    await renameWithFailure(paths.upstreamPath, transaction.backups.upstream, options, "backup-upstream");
    await writeJournal(transaction, "upstream-backed-up", options);
    await renameWithFailure(paths.manifestPath, transaction.backups.manifest, options, "backup-manifest");
    await writeJournal(transaction, "backups-created", options);

    await renameWithFailure(transaction.staged.upstream, paths.upstreamPath, options, "replace-upstream");
    await writeJournal(transaction, "upstream-replaced", options);
    await renameWithFailure(transaction.staged.manifest, paths.manifestPath, options, "replace-manifest");
    await writeJournal(transaction, "manifest-replaced", options);

    injectFailure(options, "before-post-verify");
    await verifyAcceptedPair(paths, manifest, expectedPath, transaction.new);
    injectFailure(options, "after-post-verify");
    await writeJournal(transaction, "verified", options);

    await removeWithFailure(transaction.backups.upstream, options, "remove-backup-upstream");
    await removeWithFailure(transaction.backups.manifest, options, "remove-backup-manifest");
    await writeJournal(transaction, "backups-removed", options);
    injectFailure(options, "before-remove-journal");
    await rm(paths.journalPath, { force: true });
  } catch (error) {
    if (!journalPublished && !(await fileExists(paths.journalPath))) {
      await rm(transaction.staged.upstream, { force: true });
      await rm(transaction.staged.manifest, { force: true });
      await rm(`${paths.journalPath}.accept-${transaction.id}.stage`, { force: true });
    }
    throw error;
  }

  return { operationCount: methodPathKeys.length, methodPathKeys, manifest };
}

export async function recoverOpenApiAcceptance(options = {}) {
  const paths = resolveAcceptancePaths(options);
  const journal = await readJournal(paths.journalPath);
  validateJournal(journal, paths.journalPath, options);

  const current = await currentPairHashes(journal);
  if (current.upstream === journal.new.upstream && current.manifest === journal.new.manifest) {
    await cleanupTransactionArtifacts(journal);
    return { state: "completed", phase: journal.phase };
  }
  if (current.upstream === journal.old.upstream && current.manifest === journal.old.manifest) {
    await cleanupTransactionArtifacts(journal);
    return { state: "restored-old", phase: journal.phase };
  }

  await restoreOldPair(journal);
  const restored = await currentPairHashes(journal);
  if (restored.upstream !== journal.old.upstream || restored.manifest !== journal.old.manifest) {
    throw new Error("acceptance recovery did not restore the exact old pair");
  }
  await cleanupTransactionArtifacts(journal);
  return { state: "restored-old", phase: journal.phase };
}

function resolveAcceptancePaths(options) {
  const upstreamPath = resolve(options.upstreamPath ?? "api-1.yaml");
  const manifestPath = resolve(options.manifestPath ?? "openapi/upstream-manifest.json");
  const journalPath = resolve(options.journalPath ?? join(dirname(upstreamPath), JOURNAL_NAME));
  return { upstreamPath, manifestPath, journalPath };
}

function createTransaction(paths, hashes) {
  const id = `${process.pid}-${Date.now()}-${randomUUID()}`;
  return {
    version: JOURNAL_VERSION,
    id,
    journalPath: paths.journalPath,
    upstreamPath: paths.upstreamPath,
    manifestPath: paths.manifestPath,
    staged: {
      upstream: `${paths.upstreamPath}.accept-${id}.stage`,
      manifest: `${paths.manifestPath}.accept-${id}.stage`,
    },
    backups: {
      upstream: `${paths.upstreamPath}.accept-${id}.backup`,
      manifest: `${paths.manifestPath}.accept-${id}.backup`,
    },
    old: {
      upstream: hashes.oldUpstream,
      manifest: hashes.oldManifest,
    },
    new: {
      upstream: hashes.newUpstream,
      manifest: hashes.newManifest,
    },
    phase: "prepared",
  };
}

async function verifyAcceptedPair(paths, manifest, expectedPath, expectedHashes) {
  const upstream = await readFile(paths.upstreamPath);
  const manifestBytes = await readFile(paths.manifestPath);
  if (sha256(upstream) !== expectedHashes.upstream || sha256(manifestBytes) !== expectedHashes.manifest) {
    throw new Error("accepted pair hash verification failed");
  }
  const checkedManifest = JSON.parse(manifestBytes.toString("utf8"));
  validateUpstreamManifestShape(checkedManifest, { accepted: true });
  const document = await parseOpenApiSource(upstream.toString("utf8"), "application/yaml");
  const methodPathKeys = operationInventory(document).map(({ method, path }) => `${method} ${path}`).sort();
  if (JSON.stringify(methodPathKeys) !== JSON.stringify(manifest.methodPathKeys)) {
    throw new Error("accepted pair operation inventory mismatch");
  }
  if (checkedManifest.acceptedSha256 !== expectedHashes.upstream
    || checkedManifest.canonicalSha256 !== manifest.canonicalSha256) {
    throw new Error("accepted pair manifest verification failed");
  }
  await assertExpectedOperations(methodPathKeys, expectedPath);
}

async function restoreOldPair(journal) {
  for (const item of [
    { target: journal.upstreamPath, backup: journal.backups.upstream, hash: journal.old.upstream },
    { target: journal.manifestPath, backup: journal.backups.manifest, hash: journal.old.manifest },
  ]) {
    if (await hashIfExists(item.target) === item.hash) continue;
    const backupHash = await hashIfExists(item.backup);
    if (backupHash !== item.hash) {
      throw new Error(`acceptance recovery cannot restore ${basename(item.target)} from its exact backup`);
    }
    const stage = `${item.target}.recover-${journal.id}.stage`;
    await writeSynced(stage, await readFile(item.backup));
    await rename(stage, item.target);
  }
}

async function cleanupTransactionArtifacts(journal) {
  for (const path of [
    journal.staged.upstream,
    journal.staged.manifest,
    `${journal.journalPath}.accept-${journal.id}.stage`,
    journal.backups.upstream,
    journal.backups.manifest,
    `${journal.upstreamPath}.recover-${journal.id}.stage`,
    `${journal.manifestPath}.recover-${journal.id}.stage`,
  ]) {
    await rm(path, { force: true });
  }
  await rm(journal.journalPath, { force: true });
}

async function currentPairHashes(journal) {
  return {
    upstream: await hashIfExists(journal.upstreamPath),
    manifest: await hashIfExists(journal.manifestPath),
  };
}

async function readJournal(journalPath) {
  let bytes;
  try {
    bytes = await readFile(journalPath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error("no acceptance journal found");
    throw error;
  }
  try {
    return JSON.parse(bytes);
  } catch {
    throw new Error("acceptance journal is invalid JSON; manual review is required");
  }
}

function validateJournal(journal, journalPath, options) {
  if (!journal || typeof journal !== "object" || Array.isArray(journal)) {
    throw new Error("acceptance journal is not an object; manual review is required");
  }
  if (journal.version !== JOURNAL_VERSION || !JOURNAL_PHASES.has(journal.phase)) {
    throw new Error("acceptance journal version or phase is unknown; manual review is required");
  }
  if (typeof journal.id !== "string" || !/^[A-Za-z0-9._-]+$/.test(journal.id)) {
    throw new Error("acceptance journal id is invalid; manual review is required");
  }
  for (const field of ["journalPath", "upstreamPath", "manifestPath"]) {
    if (typeof journal[field] !== "string" || !journal[field]) throw new Error(`acceptance journal field ${field} is invalid`);
  }
  if (resolve(journal.journalPath) !== journalPath) throw new Error("acceptance journal path does not match the requested journal");
  for (const field of ["staged", "backups", "old", "new"]) {
    if (!journal[field] || typeof journal[field] !== "object" || Array.isArray(journal[field])) {
      throw new Error(`acceptance journal section ${field} is invalid`);
    }
  }
  for (const field of ["upstream", "manifest"]) {
    if (!SHA256.test(journal.old[field]) || !SHA256.test(journal.new[field])) {
      throw new Error(`acceptance journal hash ${field} is invalid`);
    }
    for (const section of ["staged", "backups"]) {
      if (typeof journal[section][field] !== "string" || !journal[section][field]) {
        throw new Error(`acceptance journal ${section}.${field} is invalid`);
      }
    }
  }
  const expectedArtifacts = {
    staged: {
      upstream: `${journal.upstreamPath}.accept-${journal.id}.stage`,
      manifest: `${journal.manifestPath}.accept-${journal.id}.stage`,
    },
    backups: {
      upstream: `${journal.upstreamPath}.accept-${journal.id}.backup`,
      manifest: `${journal.manifestPath}.accept-${journal.id}.backup`,
    },
  };
  for (const section of ["staged", "backups"]) {
    for (const field of ["upstream", "manifest"]) {
      if (journal[section][field] !== expectedArtifacts[section][field]) {
        throw new Error(`acceptance journal ${section}.${field} path is not transaction-owned`);
      }
    }
  }
  const requestedUpstream = options.upstreamPath && resolve(options.upstreamPath);
  const requestedManifest = options.manifestPath && resolve(options.manifestPath);
  if ((requestedUpstream && requestedUpstream !== journal.upstreamPath)
    || (requestedManifest && requestedManifest !== journal.manifestPath)) {
    throw new Error("acceptance journal targets do not match the requested paths");
  }
}

async function assertJournalAbsent(journalPath) {
  if (await fileExists(journalPath)) {
    throw new Error(`acceptance journal exists at ${journalPath}; run --recover before accepting another candidate`);
  }
}

async function writeJournal(transaction, phase, options) {
  const next = { ...transaction, phase };
  const stage = `${transaction.journalPath}.accept-${transaction.id}.stage`;
  await writeSynced(stage, `${JSON.stringify(next, null, 2)}\n`);
  await renameWithFailure(stage, transaction.journalPath, options, `journal-${phase}`);
  transaction.phase = phase;
}

async function writeSynced(path, contents) {
  const handle = await open(path, "w");
  try {
    await handle.writeFile(contents);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function renameWithFailure(from, to, options, phase) {
  injectFailure(options, `before-${phase}-rename`);
  await rename(from, to);
  injectFailure(options, `after-${phase}-rename`);
}

async function removeWithFailure(path, options, phase) {
  injectFailure(options, `before-${phase}`);
  await rm(path, { force: true });
  injectFailure(options, `after-${phase}`);
}

function injectFailure(options, phase) {
  const configured = options.failAt ?? options.failurePhase;
  const failures = Array.isArray(configured) ? configured : [configured];
  if (failures.includes(phase)) throw new Error(`injected acceptance failure at ${phase}`);
}

async function hashIfExists(path) {
  try {
    return sha256(await readFile(path));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function printHelp() {
  process.stdout.write("Usage: accept-openapi-candidate.mjs --yes [--candidate-dir PATH] [--upstream PATH] [--manifest PATH] [--expected PATH] [--journal PATH]\n");
  process.stdout.write("       accept-openapi-candidate.mjs --recover [--upstream PATH] [--manifest PATH] [--journal PATH]\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      yes: { type: "boolean", default: false },
      recover: { type: "boolean", default: false },
      "candidate-dir": { type: "string", default: ".contract-candidate/current" },
      upstream: { type: "string", default: "api-1.yaml" },
      manifest: { type: "string", default: "openapi/upstream-manifest.json" },
      expected: { type: "string", default: "openapi/plaky115-expected-operations.json" },
      journal: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) return printHelp();
  const common = {
    upstreamPath: values.upstream,
    manifestPath: values.manifest,
    journalPath: values.journal,
  };
  if (values.recover) {
    const result = await recoverOpenApiAcceptance(common);
    process.stdout.write(`acceptance recovery: ${result.state}\n`);
    return;
  }
  const result = await acceptOpenApiCandidate({
    ...common,
    yes: values.yes,
    recover: false,
    candidateDir: values["candidate-dir"],
    expectedPath: values.expected,
  });
  process.stdout.write(`accepted upstream operations=${result.operationCount}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "candidate acceptance failed");
    process.exitCode = 1;
  }
}
