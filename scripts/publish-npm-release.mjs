#!/usr/bin/env node
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyDigestManifest } from "./lib/release-artifacts.mjs";
import { readRegistryPackage, runReleaseSubprocess } from "./lib/release-network.mjs";
import {
  classifyPublicationState,
  classifyRegistryPackage,
  PUBLICATION_ACTIONS,
} from "./lib/npm-publication.mjs";
import { verifyPublishedPackage } from "./verify-npm-attestation.mjs";

export async function publishNpmRelease({ manifestPath, tag, commit, publish = publishPackage, verify = verifyPublishedPackage, readRegistry = readRegistryPackage }) {
  const { manifest, records, manifestRoot } = await verifyDigestManifest(resolve(manifestPath), { tag, commit });
  const byName = new Map(records.map((record) => [record.package, record]));
  const sdk = byName.get("plaky115");
  const mcp = byName.get("plaky115-mcp");
  if (!sdk || !mcp) throw new Error("release digest manifest must contain plaky115 and plaky115-mcp");

  const registry = {};
  for (const record of [sdk, mcp]) {
    try {
      registry[record.package] = await readRegistry(record.package, record.version);
    } catch (error) {
      registry[record.package] = { state: "ambiguous", error: { name: error.name, message: String(error.message).slice(0, 200) } };
    }
  }
  const states = {
    sdk: classifyRegistryPackage({ registry: registry[sdk.package], artifact: sdk }),
    mcp: classifyRegistryPackage({ registry: registry[mcp.package], artifact: mcp }),
  };
  const publication = classifyPublicationState(states);
  if (publication.action === PUBLICATION_ACTIONS.BLOCKED) throw new Error(`npm publication blocked: ${publication.reason}`);
  if (publication.action === PUBLICATION_ACTIONS.FATAL) throw new Error(`npm publication fatal: ${publication.reason}`);

  const verified = [];
  if (states.sdk === "exact") {
    verified.push(await verifyRecord(sdk, manifest, verify));
  }
  if (states.mcp === "exact") {
    verified.push(await verifyRecord(mcp, manifest, verify));
  }
  if (publication.action === PUBLICATION_ACTIONS.COMPLETE) {
    return { status: "complete", action: publication.action, states, verified };
  }

  if (publication.action === PUBLICATION_ACTIONS.PUBLISH_SDK) {
    await publish(sdk, manifestRoot);
    verified.push(await verifyRecord(sdk, manifest, verify));
    await publish(mcp, manifestRoot);
    verified.push(await verifyRecord(mcp, manifest, verify));
    return { status: "published", action: "publish-sdk-and-mcp", states, verified };
  }
  if (publication.action === PUBLICATION_ACTIONS.PUBLISH_MCP) {
    await publish(mcp, manifestRoot);
    verified.push(await verifyRecord(mcp, manifest, verify));
    return { status: "resumed", action: publication.action, states, verified };
  }
  throw new Error(`unsupported npm publication action: ${publication.action}`);
}

async function verifyRecord(record, manifest, verify) {
  return verify({
    packageName: record.package,
    version: record.version,
    commit: manifest.commit,
    tag: manifest.tag,
    expectedIntegrity: record.integrity,
  });
}

async function publishPackage(record, manifestRoot) {
  const path = resolve(manifestRoot, record.relativePath);
  await runReleaseSubprocess(npmCommand(), ["publish", "--access", "public", "--provenance", path], {
    maxOutputBytes: 64 * 1024,
    label: `publish exact ${record.package}@${record.version} artifact`,
  });
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function main() {
  const { values } = parseArgs({
    options: { manifest: { type: "string" }, tag: { type: "string" }, commit: { type: "string" } },
    strict: true,
    allowPositionals: false,
  });
  if (!values.manifest || !values.tag || !values.commit) throw new Error("--manifest, --tag, and --commit are required");
  const result = await publishNpmRelease({ manifestPath: values.manifest, tag: values.tag, commit: values.commit });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
