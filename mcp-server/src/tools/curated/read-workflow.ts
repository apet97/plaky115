import { z } from "zod/v3";
import type { McpToolDefinition } from "../../runtime/types.js";
import { executeWorkflow, readWorkflowInputSchema } from "./execute-workflow.js";

export const executeReadWorkflowTool: McpToolDefinition = {
  name: "plaky_execute_read_workflow",
  title: "Execute a read-only Plaky workflow",
  description: "Run workspace.map, items.search, comments.thread, or export.items with exact workflow-specific validation.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: readWorkflowInputSchema,
  outputSchema: z.object({}).passthrough(),
  async handler(input, ctx) {
    return executeWorkflow(readWorkflowInputSchema.parse(input), ctx);
  },
};
