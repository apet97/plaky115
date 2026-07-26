import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { parseOpenApiSource } from "./lib/openapi-source-parser.mjs";

const fixtureRoot = new URL("../test/fixtures/openapi/", import.meta.url);

test("parses direct JSON and returns recursively canonical keys", async () => {
  const source = '{"paths":{"/z":{"get":{"responses":{"200":{"description":"OK"}},"operationId":"getZ"}}},"info":{"version":"1","title":"Fixture"},"openapi":"3.0.3"}';
  const parsed = await parseOpenApiSource(source, "application/json");
  assert.deepEqual(Object.keys(parsed), ["info", "openapi", "paths"]);
  assert.equal(parsed.paths["/z"].get.operationId, "getZ");
});

test("parses direct YAML through the safe Ruby boundary", async () => {
  const source = await readFile(new URL("source-yaml.yaml", fixtureRoot), "utf8");
  const parsed = await parseOpenApiSource(source, "application/yaml");
  assert.equal(Object.keys(parsed.paths).length, 2);
  assert.equal(parsed.paths["/fixture/widgets"].get.operationId, "listFixtureWidgets");
});

test("extracts a balanced const openApiSpec JSON assignment from HTML", async () => {
  const embedded = validSpec({
    description: 'literal braces {like this} and an escaped quote: "ok"',
  });
  const html = `<html><script>const openApiSpec = ${JSON.stringify(embedded)};</script></html>`;
  const parsed = await parseOpenApiSource(html, "text/html; charset=utf-8");
  assert.equal(parsed.paths["/fixture"].get.description, embedded.paths["/fixture"].get.description);
});

test("rejects malformed or missing HTML assignments", async () => {
  await assert.rejects(
    parseOpenApiSource("<script>const openApiSpec = {\"openapi\":\"3.0.3\"</script>", "text/html"),
    /unterminated openApiSpec assignment/,
  );
  await assert.rejects(
    parseOpenApiSource("<html><body>no assignment</body></html>", "text/html"),
    /openApiSpec assignment not found/,
  );
});

test("rejects non-OpenAPI objects, duplicate operation IDs, and secrets", async () => {
  await assert.rejects(
    parseOpenApiSource('{"hello":"world"}', "application/json"),
    /OpenAPI 3 version/,
  );
  const duplicate = validSpec();
  duplicate.paths["/second"] = { get: { operationId: "fixtureOperation", responses: {} } };
  await assert.rejects(
    parseOpenApiSource(JSON.stringify(duplicate), "application/json"),
    /duplicate operationId: fixtureOperation/,
  );
  const withSecret = validSpec({ description: "pl" + "k_" + "secret_tail" });
  await assert.rejects(
    parseOpenApiSource(JSON.stringify(withSecret), "application/json"),
    /secret-looking value/,
  );
});

function validSpec(operation = {}) {
  return {
    openapi: "3.0.3",
    info: { title: "Fixture", version: "1.0.0" },
    paths: {
      "/fixture": {
        get: {
          operationId: "fixtureOperation",
          responses: { 200: { description: "OK" } },
          ...operation,
        },
      },
    },
  };
}
