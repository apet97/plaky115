import assert from "node:assert/strict";
import { test } from "node:test";

import { diffOpenApiContracts } from "./diff-openapi-contract.mjs";

test("identical contracts have no semantic drift", () => {
  assert.equal(diffOpenApiContracts(baseSpec(), baseSpec()).classification, "none");
});

test("key reordering does not create semantic records", () => {
  const after = baseSpec();
  after.paths = Object.fromEntries(Object.entries(after.paths).reverse());
  after.components.schemas = Object.fromEntries(Object.entries(after.components.schemas).reverse());
  after.components.schemas.Widget.properties = Object.fromEntries(
    Object.entries(after.components.schemas.Widget.properties).reverse(),
  );
  assert.deepEqual(diffOpenApiContracts(baseSpec(), after), { classification: "none", changes: [] });
});

test("description-only drift is documentation", () => {
  const after = baseSpec();
  after.paths["/widgets"].get.description = "Updated prose";
  assert.equal(diffOpenApiContracts(baseSpec(), after).classification, "documentation");
});

test("added operations are additive and removed operations are breaking", () => {
  const added = baseSpec();
  added.paths["/widgets"].post = operation("createWidget");
  assert.equal(diffOpenApiContracts(baseSpec(), added).classification, "additive");

  const removed = baseSpec();
  delete removed.paths["/widgets/{widgetId}"].get;
  assert.equal(diffOpenApiContracts(baseSpec(), removed).classification, "breaking");
});

test("changed method or path for an operation is breaking", () => {
  const after = baseSpec();
  const moved = after.paths["/widgets/{widgetId}"].get;
  delete after.paths["/widgets/{widgetId}"].get;
  after.paths["/renamed/{widgetId}"] = { post: moved };
  const diff = diffOpenApiContracts(baseSpec(), after);
  assert.equal(diff.classification, "breaking");
  assert.ok(diff.changes.some(({ kind }) => kind === "operation-location"));
});

test("request media type and response kind drift are transport changes", () => {
  const requestChanged = baseSpec();
  requestChanged.paths["/widgets/{widgetId}"].get.requestBody = {
    content: { "multipart/form-data": { schema: { type: "object" } } },
  };
  assert.equal(diffOpenApiContracts(baseSpec(), requestChanged).classification, "transport");

  const responseChanged = baseSpec();
  responseChanged.paths["/widgets/{widgetId}"].get.responses[200].content["application/json"].schema = {
    type: "array",
    items: { type: "object" },
  };
  assert.equal(diffOpenApiContracts(baseSpec(), responseChanged).classification, "transport");
});

test("operation, parameter, request, and response changes have bounded pointer records", () => {
  const after = baseSpec();
  const operation = after.paths["/widgets/{widgetId}"].get;
  operation.parameters = [{
    name: "widgetId",
    in: "path",
    required: false,
    style: "simple",
    explode: false,
    schema: { type: "integer", minimum: 1 },
  }];
  operation.requestBody = {
    required: false,
    content: { "application/json": { schema: { type: "object" } } },
  };
  operation.responses[200].content["application/json"].schema = {
    type: "object",
    properties: { id: { type: "integer" } },
  };
  operation.responses[200].content["application/problem+json"] = {
    schema: { type: "object" },
  };
  operation.responses[404] = {
    description: "Not found",
    content: { "application/problem+json": { schema: { type: "object" } } },
  };

  const diff = diffOpenApiContracts(baseSpec(), after);
  const kinds = new Set(diff.changes.map(({ kind }) => kind));
  for (const kind of [
    "parameter-required", "parameter-style", "parameter-explode", "parameter-schema",
    "request-required", "request-media-type", "request-root",
    "response-status", "response-media-type", "response-root",
  ]) {
    assert.ok(kinds.has(kind), `missing ${kind}`);
  }
  for (const change of diff.changes) {
    assert.match(change.pointer, /^#/);
    assert.ok(change.compatibility);
    assert.ok(["compatible", "additive", "breaking", "transport", "review-required"].includes(change.compatibility.producer));
    assert.ok(["compatible", "additive", "breaking", "transport", "review-required"].includes(change.compatibility.consumer));
    assert.ok(JSON.stringify(change).length < 4096);
  }
});

test("required-property changes and enum narrowing break; enum widening is additive", () => {
  const required = baseSpec();
  required.components.schemas.Widget.required.push("state");
  assert.equal(diffOpenApiContracts(baseSpec(), required).classification, "breaking");

  const narrowed = baseSpec();
  narrowed.components.schemas.Widget.properties.state.enum = ["OPEN"];
  assert.equal(diffOpenApiContracts(baseSpec(), narrowed).classification, "breaking");

  const widened = baseSpec();
  widened.components.schemas.Widget.properties.state.enum.push("PAUSED");
  assert.equal(diffOpenApiContracts(baseSpec(), widened).classification, "additive");
});

test("schema property, enum, discriminator, security, and server records are pointer-scoped", () => {
  const after = baseSpec();
  const schema = after.components.schemas.Widget;
  schema.properties.id.type = "string";
  schema.properties.state.nullable = true;
  schema.properties.state.minimum = 1;
  schema.required.push("state");
  schema.discriminator = { propertyName: "state" };
  after.security = [{ apiKey: [] }];
  after.servers = [{ url: "https://api.example.test" }];

  const diff = diffOpenApiContracts(baseSpec(), after);
  const kinds = new Set(diff.changes.map(({ kind }) => kind));
  for (const kind of ["property-type", "property-nullability", "property-bounds", "property-required", "discriminator", "security", "servers"]) {
    assert.ok(kinds.has(kind), `missing ${kind}`);
  }
  assert.ok(diff.changes.every(({ pointer }) => pointer.startsWith("#/")));
});

test("unknown semantic changes require review instead of generic breaking", () => {
  const after = baseSpec();
  after.paths["/widgets"].get.deprecated = true;
  const diff = diffOpenApiContracts(baseSpec(), after);
  assert.equal(diff.classification, "review-required");
  assert.ok(diff.changes.some(({ kind, severity, pointer }) => (
    kind === "review-required" && severity === "review-required" && pointer.endsWith("/deprecated")
  )));
  assert.ok(!diff.changes.some(({ kind }) => kind === "contract-change"));
});

function baseSpec() {
  return {
    openapi: "3.0.3",
    info: { title: "Fixture", version: "1" },
    paths: {
      "/widgets": { get: operation("listWidgets") },
      "/widgets/{widgetId}": { get: operation("getWidget") },
    },
    components: {
      schemas: {
        Widget: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
            state: { type: "string", enum: ["OPEN", "CLOSED"] },
          },
        },
      },
    },
  };
}

function operation(operationId) {
  return {
    operationId,
    description: "Fixture operation",
    responses: {
      200: {
        description: "OK",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };
}
