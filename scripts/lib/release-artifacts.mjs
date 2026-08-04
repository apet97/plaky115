import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { runBoundedCommand, sanitizedEnvironment, withOwnedTempDirectory } from "./verification-runner.mjs";
import { scanExtractedTree } from "../secret-scan.mjs";

export const PACKAGE_LIMITS = Object.freeze({
  compressedBytes: 64 * 1024 * 1024,
  unpackedBytes: 256 * 1024 * 1024,
  entryBytes: 64 * 1024 * 1024,
  entries: 1024,
});

export const RELEASE_SUBPROCESS_LIMITS = Object.freeze({
  timeoutMs: 120_000,
  stderrBytes: 64 * 1024,
});

export class ArtifactInspectionError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause === undefined ? undefined : { cause: details.cause });
    this.name = "ArtifactInspectionError";
    Object.assign(this, details);
  }
}

export async function inspectTarball(tarballPath, options = {}) {
  const limits = { ...PACKAGE_LIMITS, ...(options.limits ?? {}) };
  const archive = resolve(tarballPath);
  const archiveStats = await stat(archive).catch((error) => {
    throw new ArtifactInspectionError(`cannot stat release artifact ${archive}`, { cause: error });
  });
  if (!archiveStats.isFile()) throw new ArtifactInspectionError("release artifact is not a regular file");
  if (archiveStats.size > limits.compressedBytes) {
    throw new ArtifactInspectionError("release artifact exceeds the compressed size limit", {
      compressedBytes: archiveStats.size,
      limit: limits.compressedBytes,
    });
  }

  const compressed = await readFile(archive);
  const tarBytes = await gunzipBounded(compressed, limits.unpackedBytes);
  const entries = parseTar(tarBytes, limits);
  const fileEntries = entries.filter((entry) => entry.type === "file");
  const inventory = fileEntries.map((entry) => entry.relativePath).sort();
  const inventoryHash = hashText(`${inventory.join("\n")}\n`, "sha256");

  if (options.extractRoot !== undefined) await extractEntries(entries, resolve(options.extractRoot));
  const packageManifest = readPackageManifest(fileEntries);
  if (options.packageName !== undefined && packageManifest.name !== options.packageName) {
    throw new ArtifactInspectionError(`release artifact package name mismatch: ${packageManifest.name}`);
  }
  if (options.packageVersion !== undefined && packageManifest.version !== options.packageVersion) {
    throw new ArtifactInspectionError(`release artifact package version mismatch: ${packageManifest.version}`);
  }

  let snapshot = { status: "not-requested" };
  if (options.snapshotPath !== undefined) {
    snapshot = compareSnapshot(inventory, await readSnapshot(options.snapshotPath));
    if (!snapshot.matches) {
      throw new ArtifactInspectionError(`release artifact package snapshot drift: ${snapshot.summary}`);
    }
  }

  let secretScan = { findings: [], failures: [] };
  if (options.extractRoot !== undefined && options.scanSecrets !== false) {
    secretScan = await scanExtractedTree(resolve(options.extractRoot));
    if (secretScan.failures.length > 0) {
      throw new ArtifactInspectionError("release artifact secret scan could not read every extracted file", {
        failures: secretScan.failures,
      });
    }
    if (secretScan.findings.length > 0) {
      throw new ArtifactInspectionError("release artifact contains a forbidden secret pattern", {
        findings: secretScan.findings,
      });
    }
  }

  return {
    archive,
    compressedBytes: archiveStats.size,
    unpackedBytes: tarBytes.byteLength,
    entryCount: entries.length,
    fileCount: fileEntries.length,
    inventory,
    inventoryHash,
    packageManifest,
    secretScan,
    snapshot,
  };
}

export async function inspectAndExtractTarball(tarballPath, options = {}) {
  return withOwnedTempDirectory("plaky115-artifact-", async (directory) => {
    const extractionRoot = join(directory, "extract");
    await mkdir(extractionRoot, { recursive: true });
    return inspectTarball(tarballPath, { ...options, extractRoot: extractionRoot });
  }, options);
}

export async function buildArtifactRecord(tarballPath, options = {}) {
  const inspection = await inspectTarball(tarballPath, options);
  const digests = await hashFile(tarballPath);
  return {
    relativePath: options.relativePath ?? tarballPath,
    package: inspection.packageManifest.name,
    version: inspection.packageManifest.version,
    dependencies: inspection.packageManifest.dependencies ?? {},
    peerDependencies: inspection.packageManifest.peerDependencies ?? {},
    optionalDependencies: inspection.packageManifest.optionalDependencies ?? {},
    compressedBytes: inspection.compressedBytes,
    sha256: digests.sha256,
    sha512: digests.sha512,
    integrity: `sha512-${Buffer.from(digests.sha512, "hex").toString("base64")}`,
    inventoryHash: inspection.inventoryHash,
    files: inspection.inventory,
  };
}

export async function verifyArtifactRecord(record, manifestRoot, options = {}) {
  if (!record || typeof record !== "object") throw new ArtifactInspectionError("artifact digest record is invalid");
  const artifactPath = resolve(manifestRoot, record.relativePath);
  if (!isWithin(resolve(manifestRoot), artifactPath)) {
    throw new ArtifactInspectionError("artifact digest path escapes its manifest root");
  }
  const actual = await buildArtifactRecord(artifactPath, {
    ...options,
    packageName: record.package,
    packageVersion: record.version,
    relativePath: record.relativePath,
  });
  for (const key of ["package", "version", "compressedBytes", "sha256", "sha512", "integrity", "inventoryHash"]) {
    if (actual[key] !== record[key]) {
      throw new ArtifactInspectionError(`artifact digest mismatch for ${record.package}: ${key}`);
    }
  }
  for (const key of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(record[key] ?? {})) {
      throw new ArtifactInspectionError(`artifact dependency manifest mismatch for ${record.package}: ${key}`);
    }
  }
  if (JSON.stringify(actual.files) !== JSON.stringify(record.files)) {
    throw new ArtifactInspectionError(`artifact file inventory mismatch for ${record.package}`);
  }
  return actual;
}

export async function verifyDigestManifest(manifestPath, options = {}) {
  const manifestRoot = resolve(options.manifestRoot ?? join(resolve(manifestPath), ".."));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.packages) || manifest.packages.length !== 2) {
    throw new ArtifactInspectionError("release digest manifest is invalid");
  }
  if (options.tag !== undefined && manifest.tag !== options.tag) throw new ArtifactInspectionError("release digest tag mismatch");
  if (options.commit !== undefined && manifest.commit !== options.commit) throw new ArtifactInspectionError("release digest commit mismatch");
  const records = [];
  for (const record of manifest.packages) {
    records.push(await verifyArtifactRecord(record, manifestRoot, options));
  }
  return { manifest, records, manifestRoot };
}

export async function installArtifactPair(records, options = {}) {
  if (!Array.isArray(records) || records.length !== 2) throw new ArtifactInspectionError("exactly two release artifacts are required");
  return withOwnedTempDirectory("plaky115-consumer-", async (directory) => {
    await writeFile(join(directory, "package.json"), `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`);
    const paths = records.map((record) => resolve(options.manifestRoot ?? ".", record.relativePath));
    await runBoundedCommand(npmCommand(), ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...paths], {
      cwd: directory,
      env: { ...sanitizedEnvironment(), npm_config_loglevel: "error" },
      timeoutMs: options.timeoutMs ?? RELEASE_SUBPROCESS_LIMITS.timeoutMs,
      maxOutputBytes: options.maxOutputBytes ?? 2 * 1024 * 1024,
      label: "install inspected npm artifacts",
    });
    return { status: "installed", packageCount: records.length };
  }, options);
}

export function compareSnapshot(inventory, baseline) {
  const expected = [...baseline].sort();
  const actual = [...inventory].sort();
  const added = actual.filter((path) => !expected.includes(path));
  const removed = expected.filter((path) => !actual.includes(path));
  return {
    matches: added.length === 0 && removed.length === 0,
    added,
    removed,
    summary: [...added.map((path) => `+${path}`), ...removed.map((path) => `-${path}`)].join(", "),
  };
}

export function hashText(value, algorithm = "sha256") {
  return createHash(algorithm).update(value).digest("hex");
}

export async function hashFile(path) {
  const bytes = await readFile(path);
  return {
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sha512: createHash("sha512").update(bytes).digest("hex"),
  };
}

async function readSnapshot(path) {
  const text = await readFile(path, "utf8");
  return text.split(/\r?\n/).filter(Boolean).sort();
}

async function gunzipBounded(compressed, maxBytes) {
  const gunzip = createGunzip();
  const chunks = [];
  let total = 0;
  try {
    for await (const chunk of Readable.from([compressed]).pipe(gunzip)) {
      total += chunk.byteLength;
      if (total > maxBytes) throw new ArtifactInspectionError("release artifact exceeds the unpacked size limit", { unpackedBytes: total, limit: maxBytes });
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof ArtifactInspectionError) throw error;
    throw new ArtifactInspectionError("release artifact is not a valid gzip archive", { cause: error });
  }
  return Buffer.concat(chunks, total);
}

function parseTar(bytes, limits) {
  const entries = [];
  const seen = new Set();
  let offset = 0;
  let totalPayload = 0;
  let pendingPath;
  let pendingPax = {};
  let sawEnd = false;

  while (offset + 512 <= bytes.byteLength) {
    const header = bytes.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      sawEnd = true;
      break;
    }
    const type = String.fromCharCode(header[156] || 48);
    const headerName = readTarString(header, 0, 100);
    const headerPrefix = readTarString(header, 345, 155);
    const headerPath = headerPrefix ? `${headerPrefix}/${headerName}` : headerName;
    const size = readTarNumber(header, 124, 12);
    if (size > limits.entryBytes) {
      throw new ArtifactInspectionError("release artifact entry exceeds the size limit", { path: headerPath, size, limit: limits.entryBytes });
    }
    const payloadEnd = offset + size;
    if (payloadEnd > bytes.byteLength) throw new ArtifactInspectionError("release artifact tar entry is truncated");
    const payload = bytes.subarray(offset, payloadEnd);
    offset += Math.ceil(size / 512) * 512;
    totalPayload += size;
    if (totalPayload > limits.unpackedBytes) throw new ArtifactInspectionError("release artifact payload exceeds the unpacked size limit");

    if (type === "x") {
      pendingPax = parsePax(payload);
      continue;
    }
    if (type === "g") throw new ArtifactInspectionError("release artifact global PAX headers are not allowed");
    if (type === "L") {
      pendingPath = readTarString(payload, 0, payload.byteLength);
      continue;
    }
    if (type === "K") throw new ArtifactInspectionError("release artifact GNU long-link headers are not allowed");

    const path = pendingPax.path ?? pendingPath ?? headerPath;
    pendingPath = undefined;
    pendingPax = {};
    const safePath = validateArchivePath(path);
    if (!safePath.startsWith("package/")) throw new ArtifactInspectionError("release artifact entry is outside the package root", { path: safePath });
    if (entries.length >= limits.entries) throw new ArtifactInspectionError("release artifact has too many entries", { limit: limits.entries });
    if (seen.has(safePath)) throw new ArtifactInspectionError("release artifact contains a duplicate path", { path: safePath });
    seen.add(safePath);

    if (type === "1" || type === "2") throw new ArtifactInspectionError("release artifact links are not allowed", { path: safePath });
    if (type !== "0" && type !== "5") throw new ArtifactInspectionError("release artifact contains an unsupported entry type", { path: safePath, type });
    entries.push({
      archivePath: safePath,
      relativePath: safePath.slice("package/".length),
      type: type === "5" ? "directory" : "file",
      size,
      content: type === "0" ? Buffer.from(payload) : undefined,
    });
  }
  if (!sawEnd) throw new ArtifactInspectionError("release artifact tar stream has no end marker");
  if (entries.length === 0) throw new ArtifactInspectionError("release artifact is empty");
  return entries;
}

function parsePax(payload) {
  const values = {};
  let offset = 0;
  while (offset < payload.byteLength) {
    const space = payload.indexOf(0x20, offset);
    if (space < 0) throw new ArtifactInspectionError("release artifact PAX header is malformed");
    const length = Number(payload.subarray(offset, space).toString("ascii"));
    if (!Number.isSafeInteger(length) || length <= 0 || offset + length > payload.byteLength) throw new ArtifactInspectionError("release artifact PAX header length is invalid");
    const record = payload.subarray(space + 1, offset + length).toString("utf8");
    const equals = record.indexOf("=");
    if (equals <= 0 || !record.endsWith("\n")) throw new ArtifactInspectionError("release artifact PAX record is malformed");
    values[record.slice(0, equals)] = record.slice(equals + 1, -1);
    offset += length;
  }
  return values;
}

function readTarString(bytes, offset, length) {
  const end = bytes.subarray(offset, offset + length).indexOf(0);
  const value = bytes.subarray(offset, offset + length).subarray(0, end < 0 ? length : end);
  return value.toString("utf8").replace(/\n+$/, "");
}

function readTarNumber(bytes, offset, length) {
  const raw = bytes.subarray(offset, offset + length).toString("ascii").replace(/\0/g, "").trim();
  if (raw === "") return 0;
  if (!/^[0-7]+$/.test(raw)) throw new ArtifactInspectionError("release artifact tar number is malformed");
  const value = Number.parseInt(raw, 8);
  if (!Number.isSafeInteger(value)) throw new ArtifactInspectionError("release artifact tar number is too large");
  return value;
}

function validateArchivePath(path) {
  if (typeof path !== "string" || path.length === 0 || path.includes("\0") || path.includes("\\") || path.startsWith("/")) {
    throw new ArtifactInspectionError("release artifact contains an unsafe path");
  }
  const segments = path.split("/");
  if (segments.some((segment) => segment === "..")) throw new ArtifactInspectionError("release artifact contains an unsafe path", { path });
  const normalized = segments.filter((segment) => segment !== "." && segment !== "").join("/");
  if (normalized === "" || normalized.startsWith("../") || normalized === "..") throw new ArtifactInspectionError("release artifact contains an unsafe path", { path });
  return normalized;
}

async function extractEntries(entries, extractionRoot) {
  await mkdir(extractionRoot, { recursive: true });
  for (const entry of entries) {
    const destination = resolve(extractionRoot, entry.archivePath);
    if (!isWithin(resolve(extractionRoot), destination)) throw new ArtifactInspectionError("release artifact extraction escaped its root");
    if (entry.type === "directory") {
      await mkdir(destination, { recursive: true });
      continue;
    }
    await mkdir(join(destination, ".."), { recursive: true });
    await writeFile(destination, entry.content, { mode: 0o644 });
  }
}

function readPackageManifest(entries) {
  const packageJson = entries.find((entry) => entry.relativePath === "package.json");
  if (!packageJson) throw new ArtifactInspectionError("release artifact is missing package.json");
  try {
    const value = JSON.parse(packageJson.content.toString("utf8"));
    if (!value || typeof value !== "object" || typeof value.name !== "string" || typeof value.version !== "string") throw new Error("name/version missing");
    return value;
  } catch (error) {
    throw new ArtifactInspectionError("release artifact package.json is invalid", { cause: error });
  }
}

function isWithin(root, candidate) {
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate === root || candidate.startsWith(prefix);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
