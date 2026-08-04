#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyDigestManifest } from "./lib/release-artifacts.mjs";

export function requireReleaseConfigReadback(value = process.env.PLAKY115_RELEASE_CONFIG_READBACK) {
  if (value !== "confirmed") throw new Error("trusted publisher and release environment readback is unresolved");
  return { status: "confirmed", source: "external release configuration readback" };
}

export async function writeReleaseEvidence({ manifestPath, publicationPath, outputPath, cliStatus }) {
  const { manifest, records } = await verifyDigestManifest(resolve(manifestPath));
  const externalConfiguration = requireReleaseConfigReadback();
  if (cliStatus !== "pass") throw new Error("CLI verification must pass before release evidence is emitted");
  const publication = JSON.parse(await readFile(publicationPath, "utf8"));
  if (!["published", "resumed", "complete"].includes(publication.status)) throw new Error("npm publication did not reach a verified terminal state");
  const evidence = {
    schemaVersion: 1,
    status: "verified",
    tag: manifest.tag,
    commit: manifest.commit,
    packages: records.map((record) => ({
      package: record.package,
      version: record.version,
      compressedBytes: record.compressedBytes,
      sha256: record.sha256,
      sha512: record.sha512,
      integrity: record.integrity,
      inventoryHash: record.inventoryHash,
    })),
    publication: { status: publication.status, action: publication.action },
    cliVerification: "pass",
    externalConfiguration,
  };
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "check-readback": { type: "boolean", default: false },
      manifest: { type: "string" },
      publication: { type: "string" },
      output: { type: "string" },
      "cli-status": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values["check-readback"]) {
    requireReleaseConfigReadback();
    process.stdout.write("release configuration readback: confirmed\n");
    return;
  }
  if (!values.manifest || !values.publication || !values.output || !values["cli-status"]) {
    throw new Error("--manifest, --publication, --output, and --cli-status are required");
  }
  const evidence = await writeReleaseEvidence({ manifestPath: values.manifest, publicationPath: values.publication, outputPath: values.output, cliStatus: values["cli-status"] });
  process.stdout.write(`${JSON.stringify({ status: evidence.status, tag: evidence.tag, packages: evidence.packages.map(({ package: name, version }) => ({ package: name, version })) })}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
