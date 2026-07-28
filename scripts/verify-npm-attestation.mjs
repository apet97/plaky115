#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

const provenanceType = "https://slsa.dev/provenance/v1";
const repository = "https://github.com/apet97/plaky115";
const sourceRepository = `git+${repository}`;
const workflowPath = ".github/workflows/release-npm.yml";

export function verifyProvenance({ statement, integrity, packageName, version, commit, tag }) {
  const expectedDigest = integrityToHex(integrity);
  const subject = statement?.subject?.find((entry) => entry?.name === `pkg:npm/${packageName}@${version}`);
  const workflow = statement?.predicate?.buildDefinition?.externalParameters?.workflow;
  const sourceURI = `${sourceRepository}@refs/tags/${tag}`;
  const dependency = statement?.predicate?.buildDefinition?.resolvedDependencies?.find((entry) => entry?.uri === sourceURI);
  const checks = {
    predicate: statement?.predicateType === provenanceType,
    digest: subject?.digest?.sha512 === expectedDigest,
    commit: dependency?.digest?.gitCommit === commit,
    source: dependency?.uri === sourceURI,
    repository: workflow?.repository === repository,
    workflow: workflow?.path === workflowPath,
    ref: workflow?.ref === `refs/tags/${tag}`,
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) throw new Error(`npm provenance verification failed: ${failed.join(", ")}`);
  return { package: packageName, version, commit, tag, digest: expectedDigest, checks };
}

function integrityToHex(integrity) {
  const match = /^sha512-([A-Za-z0-9+/]+={0,2})$/.exec(integrity ?? "");
  if (!match) throw new Error("registry integrity must be sha512 SRI");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.byteLength !== 64) throw new Error("registry integrity must contain one SHA-512 digest");
  return bytes.toString("hex");
}

async function loadRegistryProvenance(packageName, version) {
  const encoded = packageName.startsWith("@") ? packageName.replace("/", "%2f") : packageName;
  const manifest = await fetchJson(`https://registry.npmjs.org/${encoded}/${version}`);
  const url = manifest?.dist?.attestations?.url;
  if (typeof url !== "string" || !url.startsWith("https://registry.npmjs.org/")) {
    throw new Error("registry provenance URL is missing or untrusted");
  }
  const response = await fetchJson(url);
  const attestation = response?.attestations?.find((entry) => entry?.predicateType === provenanceType);
  const payload = attestation?.bundle?.dsseEnvelope?.payload;
  if (typeof payload !== "string") throw new Error("registry provenance payload is missing");
  return {
    integrity: manifest.dist.integrity,
    statement: JSON.parse(Buffer.from(payload, "base64").toString("utf8")),
  };
}

async function verifyRegistrySignature(packageName, version) {
  const directory = await mkdtemp(join(tmpdir(), "plaky115-attestation-"));
  try {
    await writeFile(join(directory, "package.json"), JSON.stringify({ private: true, dependencies: { [packageName]: version } }));
    await run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--audit=false"], directory);
    await run("npm", ["audit", "signatures"], directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error(`registry request failed with HTTP ${response.status}`);
  return response.json();
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (status) => status === 0 ? resolve() : reject(new Error(`${command} signature verification failed: ${stderr.trim()}`)));
  });
}

async function main() {
  const { values } = parseArgs({ options: {
    package: { type: "string" }, version: { type: "string" }, commit: { type: "string" }, tag: { type: "string" },
  } });
  if (!values.package || !values.version || !values.commit || !values.tag) throw new Error("--package, --version, --commit, and --tag are required");
  if (!/^[0-9a-f]{40}$/.test(values.commit)) throw new Error("--commit must be a full lowercase Git commit SHA");
  if (values.tag !== `v${values.version}`) throw new Error("--tag must equal v<version>");
  await verifyRegistrySignature(values.package, values.version);
  const provenance = await loadRegistryProvenance(values.package, values.version);
  const result = verifyProvenance({ ...provenance, packageName: values.package, version: values.version, commit: values.commit, tag: values.tag });
  process.stdout.write(`${JSON.stringify({ status: "ok", ...result })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
