import { z } from "zod/v3";
import type { McpToolDefinition } from "../../runtime/types.js";
import { executeWorkflow, mutationWorkflowInputSchema } from "./execute-workflow.js";

export const executeMutationWorkflowTool: McpToolDefinition = {
  name: "plaky_execute_mutation_workflow",
  title: "Execute a Plaky mutation workflow",
  description: "Run item, comment, Item Group, or item-file create/update workflows with exact validation. Defaults to dryRun=true unless explicitly false.",
  scopes: ["read", "write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  inputSchema: mutationWorkflowInputSchema,
  outputSchema: z.object({}).passthrough(),
  async handler(input, ctx) {
    return executeWorkflow(mutationWorkflowInputSchema.parse(input), ctx);
  },
};
