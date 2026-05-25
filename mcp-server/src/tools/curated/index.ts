import type { McpToolDefinition } from "../../runtime/types.js";
import { searchDocsTool } from "./search-docs.js";
import { workspaceContextTool } from "./workspace-context.js";
import { findTool } from "./find.js";
import { planMutationTool } from "./plan-mutation.js";
import { executeWorkflowTool } from "./execute-workflow.js";

export { searchDocsTool, workspaceContextTool, findTool, planMutationTool, executeWorkflowTool };
export { searchDocs } from "./search-docs.js";

export const curatedTools: McpToolDefinition[] = [
  searchDocsTool,
  workspaceContextTool,
  findTool,
  planMutationTool,
  executeWorkflowTool,
];
