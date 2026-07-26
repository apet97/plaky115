import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { acceptOpenApiCandidate } from "./accept-openapi-candidate.mjs";
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

test("upstream manifest schema requires all provenance fields", async () => {
  const schema = JSON.parse(
    await readFile(new URL("openapi/upstream-manifest.schema.json", root), "utf8"),
  );
  for (const field of [
    "sourceUrl", "fetchedAt", "httpStatus", "contentType", "rawSha256",
    "canonicalSha256", "info", "operationCount", "methodPathKeys",
    "acceptedAt", "acceptedSha256",
  ]) {
    assert.ok(schema.required.includes(field), `schema must require ${field}`);
  }
});

async function candidateFixture(spec) {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "plaky115-accept-test-"));
  const candidateDir = join(fixtureRoot, "candidate");
  await mkdir(candidateDir);
  const raw = Buffer.from(JSON.stringify(spec));
  const canonical = canonicalJson(spec);
  const yaml = await writeOpenApiYaml(spec);
  const methodPathKeys = operationInventory(spec).map(({ method, path }) => `${method} ${path}`).sort();
  const provenance = {
    sourceUrl: "https://docs.plaky.com/",
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
  return {
    root: fixtureRoot,
    paths: {
      candidateDir,
      upstreamPath: join(fixtureRoot, "api-1.yaml"),
      manifestPath: join(fixtureRoot, "upstream-manifest.json"),
      expectedPath: filePath(new URL("openapi/plaky115-expected-operations.json", root)),
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
