import type { McpToolDefinition } from "../../runtime/types.js";
import { searchDocsTool } from "./search-docs.js";
import { workspaceContextTool } from "./workspace-context.js";
import { findTool } from "./find.js";
import { planMutationTool } from "./plan-mutation.js";
import { executeWorkflowTool } from "./execute-workflow.js";
import { executeReadWorkflowTool } from "./read-workflow.js";
import { executeMutationWorkflowTool } from "./mutation-workflow.js";
import { WORKFLOW_IDS, MUTATION_WORKFLOW_IDS } from "./workflow-schemas.js";
import { workflowRegistry } from "./workflow-registry.js";

export {
  searchDocsTool,
  workspaceContextTool,
  findTool,
  planMutationTool,
  executeWorkflowTool,
  executeReadWorkflowTool,
  executeMutationWorkflowTool,
};
export { searchDocs } from "./search-docs.js";

const registryIds = workflowRegistry.map((workflow) => workflow.id);
if (registryIds.join("\n") !== WORKFLOW_IDS.join("\n")) {
  throw new Error("curated workflow registry and discriminated schemas are out of sync");
}
const mutationIds = new Set(MUTATION_WORKFLOW_IDS);
if (workflowRegistry.some((workflow) => workflow.mutation !== mutationIds.has(workflow.id))) {
  throw new Error("curated workflow mutation metadata is out of sync");
}

export const curatedTools: McpToolDefinition[] = [
  searchDocsTool,
  workspaceContextTool,
  findTool,
  planMutationTool,
  executeWorkflowTool,
  executeReadWorkflowTool,
  executeMutationWorkflowTool,
];
