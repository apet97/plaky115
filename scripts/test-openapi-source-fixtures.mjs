import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const root = new URL("..", import.meta.url);
const fixtures = new URL("test/fixtures/openapi/", root);
const expectedKeys = [
  "GET /fixture/widgets listFixtureWidgets",
  "GET /fixture/widgets/{widgetId} getFixtureWidget",
];

test("JSON, YAML, and complete HTML fixtures contain the same fake operations", async () => {
  const json = JSON.parse(await readFile(new URL("source-json.json", fixtures), "utf8"));
  const parsedYaml = runRuby("scripts/parse-openapi-yaml.rb", [
    filePath(new URL("source-yaml.yaml", fixtures)),
  ]);
  assert.equal(parsedYaml.status, 0, parsedYaml.stderr);
  const yaml = JSON.parse(parsedYaml.stdout);
  assert.deepEqual(operationKeys(json), expectedKeys);
  assert.deepEqual(operationKeys(yaml), expectedKeys);

  const html = await readFile(new URL("source-html.html", fixtures), "utf8");
  const assignment = html.match(/window\.__PLAKY_OPENAPI__\s*=\s*(\{.*\});/s);
  assert.ok(assignment, "complete fixture must contain a terminated assignment");
  assert.deepEqual(operationKeys(JSON.parse(assignment[1])), expectedKeys);

  const malformed = await readFile(new URL("source-malformed.html", fixtures), "utf8");
  assert.equal(/window\.__PLAKY_OPENAPI__\s*=\s*(\{.*\});/s.test(malformed), false);
});

test("Ruby YAML helpers round-trip deterministically", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plaky115-openapi-fixture-"));
  const jsonPath = join(directory, "source.json");
  const yamlPath = join(directory, "roundtrip.yaml");
  const first = runRuby("scripts/parse-openapi-yaml.rb", [
    filePath(new URL("source-yaml.yaml", fixtures)),
  ]);
  assert.equal(first.status, 0, first.stderr);
  await writeFile(jsonPath, first.stdout);

  const written = runRuby("scripts/write-openapi-yaml.rb", [jsonPath]);
  assert.equal(written.status, 0, written.stderr);
  assert.equal(written.stdout.endsWith("\n"), true);
  assert.equal(written.stdout.endsWith("\n\n"), false);
  await writeFile(yamlPath, written.stdout);

  const second = runRuby("scripts/parse-openapi-yaml.rb", [yamlPath]);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout, first.stdout);
  assert.equal(runRuby("scripts/write-openapi-yaml.rb", [jsonPath]).stdout, written.stdout);
});

test("YAML helper rejects malformed, aliased, non-object, and incomplete roots", async () => {
  const directory = await mkdtemp(join(tmpdir(), "plaky115-openapi-invalid-"));
  const cases = {
    malformed: "openapi: [\n",
    aliased: "openapi: 3.0.3\npaths: &paths {}\ncopy: *paths\n",
    array: "- openapi\n- 3.0.3\n",
    incomplete: "openapi: 3.0.3\ninfo: {}\n",
  };
  for (const [name, source] of Object.entries(cases)) {
    const path = join(directory, `${name}.yaml`);
    await writeFile(path, source);
    const result = runRuby("scripts/parse-openapi-yaml.rb", [path]);
    assert.notEqual(result.status, 0, `${name} should fail`);
    assert.match(result.stderr, /^parse-openapi-yaml: .+\n$/);
    assert.doesNotMatch(result.stderr, /\.rb:\d+|from \/|Traceback/);
  }
});

function operationKeys(spec) {
  const keys = [];
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      keys.push(`${method.toUpperCase()} ${path} ${operation.operationId}`);
    }
  }
  return keys.sort();
}

function runRuby(script, args) {
  return spawnSync("ruby", [filePath(new URL(script, root)), ...args], {
    encoding: "utf8",
  });
}

function filePath(url) {
  return decodeURIComponent(url.pathname);
}
