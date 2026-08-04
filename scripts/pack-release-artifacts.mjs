#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  buildArtifactRecord,
  inspectTarball,
  installArtifactPair,
  RELEASE_SUBPROCESS_LIMITS,
  verifyDigestManifest,
} from "./lib/release-artifacts.mjs";
import {
  runBoundedCommand,
  sanitizedEnvironment,
  withOwnedTempDirectory,
} from "./lib/verification-runner.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const packageDirectories = ["sdk", "mcp-server"];

export async function packReleaseArtifacts({ output, tag, commit, build = true }) {
  const outputRoot = resolve(output);
  await mkdir(outputRoot, { recursive: true });
  const existing = await readdir(outputRoot);
  if (existing.length > 0) throw new Error(`release artifact directory must be empty: ${outputRoot}`);
  if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(tag)) {
    throw new Error("release artifact tag must be an exact v<semver>");
  }
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("release artifact commit must be a full lowercase Git commit SHA");

  if (build) {
    for (const directory of packageDirectories) {
      await runBoundedCommand(npmCommand(), ["--prefix", directory, "run", "build"], {
        cwd: root,
        env: sanitizedEnvironment(),
        timeoutMs: RELEASE_SUBPROCESS_LIMITS.timeoutMs,
        maxOutputBytes: 2 * 1024 * 1024,
        label: `build ${directory} for release artifact packing`,
      });
    }
  }

  const packages = [];
  for (const directory of packageDirectories) {
    const packageRoot = join(root, directory);
    const packageManifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    const commandResult = await runBoundedCommand(npmCommand(), ["pack", "--json", "--ignore-scripts", "--pack-destination", outputRoot], {
      cwd: packageRoot,
      env: sanitizedEnvironment(),
      timeoutMs: RELEASE_SUBPROCESS_LIMITS.timeoutMs,
      maxOutputBytes: 2 * 1024 * 1024,
      label: `pack ${packageManifest.name} from the inspected build`,
    });
    const [packed] = parsePackOutput(commandResult.stdout);
    if (!packed?.filename || packed.name !== packageManifest.name || packed.version !== packageManifest.version) {
      throw new Error(`npm pack metadata mismatch for ${directory}`);
    }
    const artifactPath = resolve(outputRoot, packed.filename);
    const inspection = await withOwnedTempDirectory(`plaky115-pack-${directory}-`, async (temporaryRoot) => {
      const extractionRoot = join(temporaryRoot, "extract");
      return inspectTarball(artifactPath, {
        packageName: packageManifest.name,
        packageVersion: packageManifest.version,
        snapshotPath: join(packageRoot, ".packsnapshot"),
        extractRoot: extractionRoot,
      });
    });
    const record = await buildArtifactRecord(artifactPath, {
      packageName: packageManifest.name,
      packageVersion: packageManifest.version,
      snapshotPath: join(packageRoot, ".packsnapshot"),
      relativePath: relative(outputRoot, artifactPath),
    });
    if (record.inventoryHash !== inspection.inventoryHash) throw new Error(`artifact inventory changed during inspection for ${directory}`);
    packages.push(record);
  }

  const manifest = {
    schemaVersion: 1,
    tag,
    commit,
    packages,
  };
  const manifestPath = join(outputRoot, "release-digests.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await verifyDigestManifest(manifestPath, { manifestRoot: outputRoot });
  return { manifestPath, manifest };
}

export async function verifyReleaseArtifacts(manifestPath, options = {}) {
  return verifyDigestManifest(resolve(manifestPath), options);
}

export async function installReleaseArtifacts(manifestPath) {
  const result = await verifyDigestManifest(resolve(manifestPath));
  await installArtifactPair(result.records, { manifestRoot: result.manifestRoot });
  return result;
}

function parsePackOutput(stdout) {
  try {
    const value = JSON.parse(stdout);
    if (!Array.isArray(value) || value.length === 0) throw new Error("npm pack returned no artifact");
    return value;
  } catch (error) {
    throw new Error("npm pack returned invalid JSON", { cause: error });
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function main() {
  const { values } = parseArgs({
    options: {
      pack: { type: "boolean", default: false },
      verify: { type: "boolean", default: false },
      install: { type: "boolean", default: false },
      output: { type: "string" },
      manifest: { type: "string" },
      tag: { type: "string" },
      commit: { type: "string" },
      "no-build": { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.pack) {
    if (!values.output || !values.tag || !values.commit) throw new Error("--pack requires --output, --tag, and --commit");
    const result = await packReleaseArtifacts({ output: values.output, tag: values.tag, commit: values.commit, build: !values["no-build"] });
    process.stdout.write(`${JSON.stringify({ status: "ok", manifest: result.manifestPath, tag: result.manifest.tag, packages: result.manifest.packages.map(({ package: name, version, compressedBytes, integrity }) => ({ package: name, version, compressedBytes, integrity })) })}\n`);
    return;
  }
  if (!values.verify && !values.install) throw new Error("one of --pack, --verify, or --install is required");
  if (!values.manifest) throw new Error("--verify and --install require --manifest");
  const result = values.install ? await installReleaseArtifacts(values.manifest) : await verifyReleaseArtifacts(values.manifest);
  process.stdout.write(`${JSON.stringify({ status: "ok", tag: result.manifest.tag, packages: result.records.map((record) => ({ package: record.package, version: record.version, integrity: record.integrity })) })}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
