import assert from "node:assert/strict";
import { test } from "node:test";

import { diffOpenApiContracts } from "./diff-openapi-contract.mjs";

test("identical contracts have no semantic drift", () => {
  assert.equal(diffOpenApiContracts(baseSpec(), baseSpec()).classification, "none");
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
