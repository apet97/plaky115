import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { acceptOpenApiCandidate, recoverOpenApiAcceptance } from "./accept-openapi-candidate.mjs";
import { checkUpstreamManifest } from "./check-upstream-manifest.mjs";
import { canonicalJson, operationInventory, writeOpenApiYaml } from "./lib/openapi-source-parser.mjs";

const root = new URL("..", import.meta.url);
const expected = JSON.parse(
  await readFile(new URL("openapi/plaky115-expected-operations.json", root), "utf8"),
);

test("candidate acceptance refuses to run without explicit yes", async () => {
  const fixture = await candidateFixture(completeSpec());
  await assert.rejects(
    acceptOpenApiCandidate({ ...fixture.paths, yes: false }),
    /requires --yes/,
  );
  await rm(fixture.root, { recursive: true, force: true });
});

test("candidate acceptance writes a verifiable upstream file and manifest", async () => {
  const fixture = await candidateFixture(completeSpec());
  const accepted = await acceptOpenApiCandidate({
    ...fixture.paths,
    yes: true,
    now: () => new Date("2026-07-26T20:30:00.000Z"),
  });
  assert.equal(accepted.operationCount, 32);
  const checked = await checkUpstreamManifest({
    upstreamPath: fixture.paths.upstreamPath,
    manifestPath: fixture.paths.manifestPath,
    expectedPath: filePath(new URL("openapi/plaky115-expected-operations.json", root)),
  });
  assert.equal(checked.operationCount, 32);
  assert.equal(JSON.parse(await readFile(fixture.paths.manifestPath, "utf8")).acceptedAt, "2026-07-26T20:30:00.000Z");
  await rm(fixture.root, { recursive: true, force: true });
});

test("acceptance rejects candidate provenance hash mismatch", async () => {
  const fixture = await candidateFixture(completeSpec());
  const provenance = JSON.parse(await readFile(join(fixture.paths.candidateDir, "provenance.json"), "utf8"));
  provenance.canonicalSha256 = "0".repeat(64);
  await writeFile(join(fixture.paths.candidateDir, "provenance.json"), `${JSON.stringify(provenance)}\n`);
  await assert.rejects(
    acceptOpenApiCandidate({ ...fixture.paths, yes: true }),
    /canonical SHA-256 mismatch/,
  );
  await rm(fixture.root, { recursive: true, force: true });
});

test("acceptance rejects a candidate missing expected operations", async () => {
  const spec = completeSpec();
  delete spec.paths[expected.operations.at(-1).path].delete;
  const fixture = await candidateFixture(spec);
  await assert.rejects(
    acceptOpenApiCandidate({ ...fixture.paths, yes: true }),
    /missing expected operation: DELETE/,
  );
  await rm(fixture.root, { recursive: true, force: true });
});

test("acceptance failures leave an old or new pair recoverable at every replacement boundary", async () => {
  const phases = [
    "before-backup-upstream-rename",
    "after-backup-upstream-rename",
    "before-backup-manifest-rename",
    "after-backup-manifest-rename",
    "before-replace-upstream-rename",
    "after-replace-upstream-rename",
    "before-replace-manifest-rename",
    "after-replace-manifest-rename",
    "before-post-verify",
    "after-post-verify",
    "before-remove-backup-upstream",
    "after-remove-backup-upstream",
  ];
  for (const phase of phases) {
    const fixture = await candidateFixture(completeSpec());
    const oldUpstream = await readFile(fixture.paths.upstreamPath);
    const oldManifest = await readFile(fixture.paths.manifestPath);
    const candidate = await readFile(join(fixture.paths.candidateDir, "candidate.yaml"));

    await assert.rejects(
      acceptOpenApiCandidate({
        ...fixture.paths,
        yes: true,
        failAt: phase,
      }),
      /injected acceptance failure/,
      phase,
    );
    assert.equal(await fileExists(fixture.paths.journalPath), true, `${phase} must leave a journal`);

    await recoverOpenApiAcceptance(fixture.paths);
    const recoveredUpstream = await readFile(fixture.paths.upstreamPath);
    const recoveredManifest = await readFile(fixture.paths.manifestPath);
    const oldPair = recoveredUpstream.equals(oldUpstream) && recoveredManifest.equals(oldManifest);
    const newPair = recoveredUpstream.equals(candidate);
    assert.ok(oldPair || newPair, `${phase} recovered a mixed pair`);
    assert.equal(await fileExists(fixture.paths.journalPath), false, `${phase} journal cleanup`);
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a stale or unknown acceptance journal blocks a new acceptance", async () => {
  const fixture = await candidateFixture(completeSpec());
  await writeFile(fixture.paths.journalPath, "not-json\n");
  await assert.rejects(
    acceptOpenApiCandidate({ ...fixture.paths, yes: true }),
    /acceptance journal exists/,
  );
  await assert.rejects(
    recoverOpenApiAcceptance(fixture.paths),
    /invalid JSON|manual review/,
  );
  await rm(fixture.root, { recursive: true, force: true });
});

test("upstream manifest schema requires all provenance fields", async () => {
  const schema = JSON.parse(
    await readFile(new URL("openapi/upstream-manifest.schema.json", root), "utf8"),
  );
  for (const field of [
    "sourceUrl", "requestedUrl", "finalUrl", "redirectChain", "fetchedAt", "httpStatus", "contentType", "rawSha256",
    "canonicalSha256", "info", "operationCount", "methodPathKeys",
    "acceptedAt", "acceptedSha256",
  ]) {
    assert.ok(schema.required.includes(field), `schema must require ${field}`);
  }
});

async function candidateFixture(spec) {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "plaky115-accept-test-"));
  const candidateDir = join(fixtureRoot, "candidate");
  const upstreamPath = join(fixtureRoot, "api-1.yaml");
  const manifestPath = join(fixtureRoot, "upstream-manifest.json");
  const expectedPath = filePath(new URL("openapi/plaky115-expected-operations.json", root));
  await mkdir(candidateDir);
  const raw = Buffer.from(JSON.stringify(spec));
  const canonical = canonicalJson(spec);
  const yaml = await writeOpenApiYaml(spec);
  const methodPathKeys = operationInventory(spec).map(({ method, path }) => `${method} ${path}`).sort();
  const provenance = {
    sourceUrl: "https://docs.plaky.com/",
    requestedUrl: "https://docs.plaky.com/",
    finalUrl: "https://docs.plaky.com/",
    redirectChain: [],
    fetchedAt: "2026-07-26T20:00:00.000Z",
    httpStatus: 200,
    contentType: "application/json",
    rawSha256: sha256(raw),
    canonicalSha256: sha256(Buffer.from(canonical)),
    info: spec.info,
    operationCount: methodPathKeys.length,
    methodPathKeys,
  };
  await writeFile(join(candidateDir, "raw-source"), raw);
  await writeFile(join(candidateDir, "canonical.json"), canonical);
  await writeFile(join(candidateDir, "candidate.yaml"), yaml);
  await writeFile(join(candidateDir, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);

  const oldSpec = completeSpec();
  oldSpec.info.title = "Existing accepted contract";
  const oldRaw = Buffer.from(JSON.stringify(oldSpec));
  const oldCanonical = canonicalJson(oldSpec);
  const oldYaml = await writeOpenApiYaml(oldSpec);
  const oldKeys = operationInventory(oldSpec).map(({ method, path }) => `${method} ${path}`).sort();
  const oldManifest = {
    sourceUrl: "https://docs.plaky.com/",
    requestedUrl: "https://docs.plaky.com/",
    finalUrl: "https://docs.plaky.com/",
    redirectChain: [],
    fetchedAt: "2026-07-26T19:00:00.000Z",
    httpStatus: 200,
    contentType: "application/json",
    rawSha256: sha256(oldRaw),
    canonicalSha256: sha256(Buffer.from(oldCanonical)),
    info: oldSpec.info,
    operationCount: oldKeys.length,
    methodPathKeys: oldKeys,
    acceptedAt: "2026-07-26T19:30:00.000Z",
    acceptedSha256: sha256(Buffer.from(oldYaml)),
  };
  await writeFile(upstreamPath, oldYaml);
  await writeFile(manifestPath, `${JSON.stringify(oldManifest, null, 2)}\n`);
  return {
    root: fixtureRoot,
    paths: {
      candidateDir,
      upstreamPath,
      manifestPath,
      expectedPath,
      journalPath: join(fixtureRoot, ".journal.json"),
    },
  };
}

function completeSpec() {
  const paths = {};
  for (const operation of expected.operations) {
    paths[operation.path] ??= {};
    paths[operation.path][operation.method.toLowerCase()] = {
      operationId: operation.operationId,
      responses: { 200: { description: "OK" } },
    };
  }
  return { openapi: "3.0.3", info: { title: "Fixture", version: "1" }, paths };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function filePath(url) {
  return decodeURIComponent(url.pathname);
}

async function fileExists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}
