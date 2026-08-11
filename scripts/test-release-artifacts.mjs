import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  ArtifactInspectionError,
  compareSnapshot,
  inspectAndExtractTarball,
  inspectTarball,
  PACKAGE_LIMITS,
} from "./lib/release-artifacts.mjs";

const token = (tail) => ["pl", "k_", tail].join("");

test("inspects a valid npm-style tarball, scans binary bytes, and matches a snapshot", async () => {
  const fixture = await createArchive([
    { path: "package/package.json", content: '{"name":"fixture","version":"1.0.0"}\n' },
    { path: "package/esm/index.js", content: "export const ok = true;\n" },
    { path: "package/bin/fixture", content: "#!/bin/sh\nexit 0\n" },
  ]);
  try {
    const snapshot = join(fixture.root, "snapshot");
    await writeFile(snapshot, "bin/fixture\nesm/index.js\npackage.json\n");
    const result = await inspectTarball(fixture.archive, {
      packageName: "fixture",
      packageVersion: "1.0.0",
      snapshotPath: snapshot,
      extractRoot: join(fixture.root, "extract"),
    });
    assert.equal(result.entryCount, 3);
    assert.equal(result.inventoryHash.length, 64);
    assert.equal(result.secretScan.findings.length, 0);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("forbidden text in a binary package entry is rejected without revealing it", async () => {
  const secret = token("binary");
  const fixture = await createArchive([
    { path: "package/package.json", content: '{"name":"fixture","version":"1.0.0"}\n' },
    { path: "package/bin/fixture", content: Buffer.concat([Buffer.from(secret), Buffer.from([0]), Buffer.from("tail")]) },
  ]);
  try {
    await assert.rejects(
      inspectAndExtractTarball(fixture.archive, { packageName: "fixture", packageVersion: "1.0.0" }),
      (error) => error instanceof ArtifactInspectionError && /forbidden secret pattern/.test(error.message) && !error.message.includes(secret),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

for (const [name, entries, expected] of [
  ["traversal", [{ path: "package/../escape", content: "x" }], /unsafe path/],
  ["absolute path", [{ path: "/package/package.json", content: "{}" }], /unsafe path/],
  ["symlink", [{ path: "package/package.json", content: '{"name":"fixture","version":"1.0.0"}\n' }, { path: "package/link", link: "package/package.json" }], /links are not allowed/],
]) {
  test(`rejects ${name} archive entries`, async () => {
    const fixture = await createArchive(entries);
    try {
      await assert.rejects(inspectTarball(fixture.archive), expected);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
}

test("enforces compressed, unpacked, entry, and count limits before extraction", async () => {
  const fixture = await createArchive([
    { path: "package/package.json", content: '{"name":"fixture","version":"1.0.0"}\n' },
    { path: "package/one", content: "12345" },
    { path: "package/two", content: "x" },
  ]);
  try {
    await assert.rejects(inspectTarball(fixture.archive, { limits: { entries: 2 } }), /too many entries/);
    await assert.rejects(inspectTarball(fixture.archive, { limits: { entryBytes: 4 } }), /entry exceeds/);
    await assert.rejects(inspectTarball(fixture.archive, { limits: { unpackedBytes: 4 } }), /unpacked size|payload exceeds|entry exceeds/);
    await assert.rejects(inspectTarball(fixture.archive, { limits: { compressedBytes: 1 } }), /compressed size/);
    assert.equal(PACKAGE_LIMITS.entries, 1024);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("snapshot comparison reports only bounded path deltas", () => {
  assert.deepEqual(compareSnapshot(["b", "a"], ["a", "c"]), {
    matches: false,
    added: ["b"],
    removed: ["c"],
    summary: "+b, -c",
  });
});

async function createArchive(entries) {
  const root = await mkdtemp(join(tmpdir(), "plaky115-release-artifact-test-"));
  const archive = join(root, "fixture.tgz");
  const description = JSON.stringify(entries.map((entry) => ({
    path: entry.path,
    link: entry.link,
    content: Buffer.isBuffer(entry.content) ? entry.content.toString("base64") : Buffer.from(entry.content ?? "").toString("base64"),
  })));
  execFileSync("python3", ["-c", [
    "import base64, json, sys, tarfile",
    "entries = json.loads(sys.argv[2])",
    "with tarfile.open(sys.argv[1], 'w:gz') as archive:",
    "  for entry in entries:",
    "    info = tarfile.TarInfo(entry['path'])",
    "    if entry.get('link'):",
    "      info.type = tarfile.SYMTYPE; info.linkname = entry['link']; archive.addfile(info); continue",
    "    data = base64.b64decode(entry['content'])",
    "    info.size = len(data); archive.addfile(info, __import__('io').BytesIO(data))",
  ].join("\n"), archive, description]);
  return { root, archive };
}
