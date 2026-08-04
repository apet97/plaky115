#!/usr/bin/env node
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { VerificationCommandError, withOwnedTempDirectory } from "./lib/verification-runner.mjs";
import {
  fetchJsonBounded,
  readRegistryPackage,
  RegistryRequestError,
  retryRegistryRead,
  runReleaseSubprocess,
  REGISTRY_LIMITS,
} from "./lib/release-network.mjs";

export const PROVENANCE_TYPE = "https://slsa.dev/provenance/v1";
export const PROVENANCE_BUILD_TYPE = "https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1";
export const REVIEWED_BUILDER_ID = "https://github.com/actions/runner/github-hosted";
export const REPOSITORY = "https://github.com/apet97/plaky115";
export const SOURCE_REPOSITORY = `git+${REPOSITORY}`;
export const WORKFLOW_PATH = ".github/workflows/release-npm.yml";
export const RELEASE_ENVIRONMENT = "npm-release";

export function verifyProvenance({
  statement,
  integrity,
  packageName,
  version,
  commit,
  tag,
  environment = RELEASE_ENVIRONMENT,
  builderId = REVIEWED_BUILDER_ID,
}) {
  const expectedDigest = integrityToHex(integrity);
  const subjectEntries = Array.isArray(statement?.subject)
    ? statement.subject.filter((entry) => entry?.name === `pkg:npm/${packageName}@${version}`)
    : [];
  const buildDefinition = statement?.predicate?.buildDefinition;
  const workflow = buildDefinition?.externalParameters?.workflow;
  const dependencies = Array.isArray(buildDefinition?.resolvedDependencies) ? buildDefinition.resolvedDependencies : [];
  const sourceURI = `${SOURCE_REPOSITORY}@refs/tags/${tag}`;
  const sourceEntries = dependencies.filter((entry) => entry?.uri === sourceURI);
  const checks = {
    predicate: statement?.predicateType === PROVENANCE_TYPE,
    subjectCount: Array.isArray(statement?.subject) && statement.subject.length === 1 && subjectEntries.length === 1,
    digest: subjectEntries[0]?.digest?.sha512 === expectedDigest,
    dependencyCount: dependencies.length === 1 && sourceEntries.length === 1,
    commit: sourceEntries[0]?.digest?.gitCommit === commit,
    source: sourceEntries[0]?.uri === sourceURI,
    repository: workflow?.repository === REPOSITORY,
    workflow: workflow?.path === WORKFLOW_PATH,
    ref: workflow?.ref === `refs/tags/${tag}`,
    environment: workflow?.environment === undefined || workflow.environment === environment,
    buildType: buildDefinition?.buildType === PROVENANCE_BUILD_TYPE,
    builder: statement?.predicate?.runDetails?.builder?.id === builderId,
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) throw new Error(`npm provenance verification failed: ${failed.join(", ")}`);
  return { package: packageName, version, commit, tag, digest: expectedDigest, checks };
}

export function integrityToHex(integrity) {
  const match = /^sha512-([A-Za-z0-9+/]+={0,2})$/.exec(integrity ?? "");
  if (!match) throw new Error("registry integrity must be sha512 SRI");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.byteLength !== 64) throw new Error("registry integrity must contain one SHA-512 digest");
  return bytes.toString("hex");
}

export async function loadRegistryProvenance(packageName, version, options = {}) {
  const packageState = await readRegistryPackage(packageName, version, options);
  if (packageState.state !== "present") throw new RegistryRequestError("published package is not visible in the npm registry", { status: 404, reason: "eventual-consistency" });
  const url = packageState.manifest?.dist?.attestations?.url;
  if (typeof url !== "string") throw new Error("registry provenance URL is missing");
  const response = await fetchJsonBounded(url, {
    ...options,
    maxBytes: options.attestationBytes ?? REGISTRY_LIMITS.attestationBytes,
    allowedOrigin: "https://registry.npmjs.org",
  });
  const attestations = Array.isArray(response?.attestations)
    ? response.attestations.filter((entry) => entry?.predicateType === PROVENANCE_TYPE)
    : [];
  if (attestations.length !== 1) throw new Error("registry provenance must contain exactly one SLSA attestation");
  const payload = attestations[0]?.bundle?.dsseEnvelope?.payload;
  if (typeof payload !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) throw new Error("registry provenance payload is missing or invalid");
  const decoded = Buffer.from(payload, "base64");
  if (decoded.byteLength > (options.decodedAttestationBytes ?? REGISTRY_LIMITS.attestationBytes)) {
    throw new Error("decoded registry provenance exceeds the size limit");
  }
  let statement;
  try { statement = JSON.parse(decoded.toString("utf8")); } catch (error) { throw new Error("registry provenance payload is not JSON", { cause: error }); }
  return { integrity: packageState.manifest?.dist?.integrity, statement, manifest: packageState.manifest };
}

export async function verifyRegistrySignature(packageName, version, options = {}) {
  return retryRegistryRead(
    () => withOwnedTempDirectory("plaky115-attestation-", async (directory) => {
      await writePackageManifest(directory, packageName, version);
      try {
        await runReleaseSubprocess(npmCommand(), ["install", "--ignore-scripts", "--audit=false", "--no-fund", "--no-progress"], {
          cwd: directory,
          timeoutMs: options.timeoutMs,
          maxOutputBytes: options.maxOutputBytes ?? 64 * 1024,
          label: `install ${packageName}@${version} for signature verification`,
        });
      } catch (error) {
        if (error instanceof VerificationCommandError && /npm error (?:code ETARGET|notarget No matching version)/i.test(error.stderr ?? "")) {
          throw new RegistryRequestError("published package is not visible yet", { status: 404, reason: "eventual-consistency", cause: error });
        }
        throw error;
      }
      try {
        await runReleaseSubprocess(npmCommand(), ["audit", "signatures"], {
          cwd: directory,
          timeoutMs: options.timeoutMs,
          maxOutputBytes: options.maxOutputBytes ?? 64 * 1024,
          label: `verify npm signature for ${packageName}@${version}`,
        });
      } catch (error) {
        if (error instanceof VerificationCommandError && /npm error (?:code E404|404 Not Found)/i.test(error.stderr ?? "")) {
          throw new RegistryRequestError("npm signature is not visible yet", { status: 404, reason: "eventual-consistency", cause: error });
        }
        throw error;
      }
      return { package: packageName, version, status: "verified" };
    }),
    { signal: options.signal, isTransient: (error) => error instanceof RegistryRequestError && [404, 202, 429, 500, 502, 503, 504].includes(error.status) },
  );
}

export async function verifyPublishedPackage({ packageName, version, commit, tag, expectedIntegrity, environment = RELEASE_ENVIRONMENT, builderId = REVIEWED_BUILDER_ID, signal } = {}) {
  await verifyRegistrySignature(packageName, version);
  const provenance = await retryRegistryRead(
    () => loadRegistryProvenance(packageName, version, { signal }),
    { isTransient: (error) => error instanceof RegistryRequestError && [404, 202, 429, 500, 502, 503, 504].includes(error.status) },
  );
  if (expectedIntegrity !== undefined && provenance.integrity !== expectedIntegrity) throw new Error(`published ${packageName}@${version} integrity does not match the inspected artifact`);
  return verifyProvenance({
    ...provenance,
    packageName,
    version,
    commit,
    tag,
    environment,
    builderId,
  });
}

async function writePackageManifest(directory, packageName, version) {
  await writeFile(join(directory, "package.json"), `${JSON.stringify({ private: true, dependencies: { [packageName]: version } })}\n`);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function main() {
  const { values } = parseArgs({
    options: {
      package: { type: "string" }, version: { type: "string" }, commit: { type: "string" }, tag: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  if (!values.package || !values.version || !values.commit || !values.tag) throw new Error("--package, --version, --commit, and --tag are required");
  if (!/^[0-9a-f]{40}$/.test(values.commit)) throw new Error("--commit must be a full lowercase Git commit SHA");
  if (values.tag !== `v${values.version}`) throw new Error("--tag must equal v<version>");
  const result = await verifyPublishedPackage({ packageName: values.package, version: values.version, commit: values.commit, tag: values.tag });
  process.stdout.write(`${JSON.stringify({ status: "ok", ...result })}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
