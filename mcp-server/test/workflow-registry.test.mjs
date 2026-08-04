import assert from "node:assert/strict";
import { test } from "node:test";
import { docsIndex } from "../esm/runtime/docs-index.js";
import { curatedTools } from "../esm/tools/curated/index.js";
import { MUTATION_WORKFLOW_IDS, READ_WORKFLOW_IDS, WORKFLOW_IDS } from "../esm/tools/curated/workflow-schemas.js";
import { workflowRegistry } from "../esm/tools/curated/workflow-registry.js";

test("workflow registry, schema discriminators, and docs have one exact ID set", () => {
  assert.deepEqual(workflowRegistry.map((workflow) => workflow.id), WORKFLOW_IDS);
  assert.deepEqual(workflowRegistry.filter((workflow) => workflow.mutation).map((workflow) => workflow.id), MUTATION_WORKFLOW_IDS);
  assert.deepEqual(workflowRegistry.filter((workflow) => !workflow.mutation).map((workflow) => workflow.id), READ_WORKFLOW_IDS);

  const docs = docsIndex.filter((entry) => entry.kind === "workflow");
  assert.deepEqual(docs.map((entry) => entry.workflowId), WORKFLOW_IDS);
  for (const workflow of workflowRegistry) {
    const doc = docs.find((entry) => entry.workflowId === workflow.id);
    assert.ok(doc, workflow.id);
    assert.deepEqual(doc.scopes, workflow.scopes);
    assert.equal(doc.mutation, workflow.mutation);
    assert.equal(doc.destructive, workflow.destructive);
    assert.equal(doc.openWorld, workflow.openWorld);
    assert.equal(doc.schemaKey, workflow.schemaKey);
  }
});

test("every Plaky-contacting curated tool advertises open-world behavior", () => {
  for (const tool of curatedTools) {
    assert.equal(tool.annotations.openWorldHint, tool.name === "plaky_search_docs" ? false : true, tool.name);
  }
});
