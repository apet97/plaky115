import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));

test("the derived OpenAPI contract passes the pinned standards validator", () => {
  const result = run("openapi/plaky115-dx.openapi.yaml");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /openapi-standards: OK/);
});

test("standards validation rejects invalid OpenAPI 3.1 response schemas", () => {
  const directory = mkdtempSync(join(tmpdir(), "plaky115-openapi-validation-"));
  try {
    const path = join(directory, "invalid.yaml");
    writeFileSync(path, [
      "openapi: 3.1.0",
      "info:",
      "  title: Fixture",
      "  version: 1.0.0",
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      responses:",
      "        '200':",
      "          description: OK",
      "          content:",
      "            application/json:",
      "              schema:",
      "                type: not-a-json-schema-type",
      "",
    ].join("\n"));

    const result = run(path);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /not-a-json-schema-type|schema|response/i);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("standards validation rejects invalid dialect, parameter, security, discriminator, union, and response structures", () => {
  const fixtures = {
    dialect: [
      "jsonSchemaDialect: https://example.test/dialect",
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      responses:",
      "        '200': { description: OK }",
    ],
    parameter: [
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      parameters: [{ name: fixture }]",
      "      responses:",
      "        '200': { description: OK }",
    ],
    security: [
      "security: [{ apiKey: read }]",
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      responses:",
      "        '200': { description: OK }",
    ],
    discriminator: [
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      responses:",
      "        '200':",
      "          description: OK",
      "          content:",
      "            application/json:",
      "              schema:",
      "                type: object",
      "                discriminator: { propertyName: 1 }",
    ],
    "nullable-union": [
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      responses:",
      "        '200':",
      "          description: OK",
      "          content:",
      "            application/json:",
      "              schema: { type: [string, invalid] }",
    ],
    response: [
      "paths:",
      "  /fixture:",
      "    get:",
      "      operationId: getFixture",
      "      responses:",
      "        '200': {}",
    ],
  };

  for (const [name, body] of Object.entries(fixtures)) {
    const directory = mkdtempSync(join(tmpdir(), "plaky115-openapi-validation-"));
    try {
      const path = join(directory, `${name}.yaml`);
      writeFileSync(path, ["openapi: 3.1.0", "info:", "  title: Fixture", "  version: 1.0.0", ...body, ""].join("\n"));
      const result = run(path);
      assert.notEqual(result.status, 0, `${name} fixture unexpectedly passed`);
      assert.match(`${result.stdout}\n${result.stderr}`, /error|invalid|required|schema|parameter|security|discriminator|response|dialect|mapping/i, name);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

function run(path) {
  return spawnSync(process.execPath, ["scripts/validate-openapi.mjs", path], {
    cwd: root,
    encoding: "utf8",
  });
}
