import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { acquireOpenApiCandidate } from "./fetch-plaky-openapi.mjs";
import { writeOpenApiYaml } from "./lib/openapi-source-parser.mjs";

const root = new URL("..", import.meta.url);
const expected = JSON.parse(
  await readFile(new URL("openapi/plaky115-expected-operations.json", root), "utf8"),
);

test("fetch acquisition handles JSON, YAML, and embedded HTML sources", async (t) => {
  const spec = completeSpec();
  const variants = [
    ["application/json", JSON.stringify(spec)],
    ["application/yaml", await writeOpenApiYaml(spec)],
    ["text/html", `<script>const openApiSpec = ${JSON.stringify(spec)};</script>`],
  ];
  for (const [contentType, source] of variants) {
    await t.test(contentType, async () => {
      const parent = await temporaryParent();
      const fetchImpl = async (_url, options) => {
        assert.equal(options.redirect, "follow");
        assert.ok(options.signal instanceof AbortSignal);
        return response(200, contentType, source);
      };
      const result = await acquireOpenApiCandidate({
        fetchImpl,
        candidateParent: parent,
        sourceUrl: "https://docs.plaky.com/openapi",
        now: () => new Date("2026-07-26T20:00:00.000Z"),
      });
      assert.equal(result.exitCode, 0);
      const current = join(parent, "current");
      const provenance = JSON.parse(await readFile(join(current, "provenance.json"), "utf8"));
      assert.equal(provenance.operationCount, 32);
      assert.equal(provenance.sourceUrl, "https://docs.plaky.com/openapi");
      assert.equal(provenance.fetchedAt, "2026-07-26T20:00:00.000Z");
      assert.equal(provenance.contentType, contentType);
      assert.equal(provenance.methodPathKeys.length, 32);
      assert.match(provenance.rawSha256, /^[a-f0-9]{64}$/);
      assert.match(provenance.canonicalSha256, /^[a-f0-9]{64}$/);
      assert.equal((await readFile(join(current, "raw-source"), "utf8")), source);
      assert.equal(JSON.parse(await readFile(join(current, "canonical.json"), "utf8")).openapi, "3.0.3");
      assert.match(await readFile(join(current, "candidate.yaml"), "utf8"), /^---\n/);
      await rm(parent, { recursive: true, force: true });
    });
  }
});

test("file acquisition replaces current evidence and reports twelve-path hold point", async () => {
  const parent = await temporaryParent();
  const current = join(parent, "current");
  await writeFile(join(parent, "source.json"), JSON.stringify(fixtureSpec()));
  await mkdir(current);
  await writeFile(join(current, "stale"), "old");

  const result = await acquireOpenApiCandidate({
    candidateParent: parent,
    file: join(parent, "source.json"),
    now: () => new Date("2026-07-26T20:00:00.000Z"),
  });

  assert.equal(result.exitCode, 3);
  assert.equal(result.missing.length, 12);
  assert.equal(result.unexpected.length, 0);
  await assert.rejects(readFile(join(current, "stale"), "utf8"), /ENOENT/);
  assert.equal(JSON.parse(await readFile(join(current, "provenance.json"), "utf8")).operationCount, 2);
  await rm(parent, { recursive: true, force: true });
});

test("non-2xx fetch never reads or exposes the response body", async () => {
  const parent = await temporaryParent();
  let bodyRead = false;
  const fetchImpl = async () => ({
    ...response(503, "text/plain", "private upstream body"),
    async text() {
      bodyRead = true;
      return "private upstream body";
    },
  });
  await assert.rejects(
    acquireOpenApiCandidate({ fetchImpl, candidateParent: parent }),
    (error) => {
      assert.match(error.message, /HTTP 503/);
      assert.doesNotMatch(error.message, /private upstream body/);
      return true;
    },
  );
  assert.equal(bodyRead, false);
  await rm(parent, { recursive: true, force: true });
});

test("redirected response is accepted and timeout failures remain concise", async () => {
  const redirectParent = await temporaryParent();
  const redirected = response(200, "application/json", JSON.stringify(completeSpec()));
  redirected.redirected = true;
  redirected.url = "https://cdn.plaky.com/openapi.json";
  assert.equal((await acquireOpenApiCandidate({
    fetchImpl: async () => redirected,
    candidateParent: redirectParent,
  })).exitCode, 0);
  await rm(redirectParent, { recursive: true, force: true });

  const timeoutParent = await temporaryParent();
  await assert.rejects(
    acquireOpenApiCandidate({
      fetchImpl: async (_url, { signal }) => {
        assert.ok(signal instanceof AbortSignal);
        throw new DOMException("timed out", "TimeoutError");
      },
      candidateParent: timeoutParent,
    }),
    /OpenAPI fetch failed: timed out/,
  );
  await rm(timeoutParent, { recursive: true, force: true });
});

test("invalid OpenAPI source fails without replacing current evidence", async () => {
  const parent = await temporaryParent();
  const current = join(parent, "current");
  await mkdir(current);
  await writeFile(join(current, "sentinel"), "preserve");
  await assert.rejects(
    acquireOpenApiCandidate({
      fetchImpl: async () => response(200, "application/json", '{"not":"openapi"}'),
      candidateParent: parent,
    }),
    /OpenAPI 3 version/,
  );
  assert.equal(await readFile(join(current, "sentinel"), "utf8"), "preserve");
  await rm(parent, { recursive: true, force: true });
});

function response(status, contentType, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    redirected: false,
    url: "https://docs.plaky.com/",
    headers: new Headers({ "content-type": contentType }),
    async text() { return body; },
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
  return {
    openapi: "3.0.3",
    info: { title: "Complete fixture", version: "1.0.0" },
    paths,
  };
}

function fixtureSpec() {
  return JSON.parse(JSON.stringify({
    openapi: "3.0.3",
    info: { title: "Small fixture", version: "1.0.0" },
    paths: {
      "/fixture/one": { get: { operationId: "one", responses: {} } },
      "/fixture/two": { post: { operationId: "two", responses: {} } },
    },
  }));
}

async function temporaryParent() {
  return mkdtemp(join(tmpdir(), "plaky115-fetch-test-"));
}
