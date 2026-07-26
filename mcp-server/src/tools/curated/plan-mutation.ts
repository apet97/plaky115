import { z } from "zod/v3";
import type { McpToolDefinition } from "../../runtime/types.js";
import { MUTATION_WORKFLOW_IDS, mutationPlanInputSchema } from "./execute-workflow.js";

export const planMutationTool: McpToolDefinition = {
  name: "plaky_plan_mutation",
  title: "Plan a Plaky mutation",
  description: "Validate and return a dry-run plan for items.create, items.updateFields, or comments.add.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: mutationPlanInputSchema,
  outputSchema: z.object({
    workflowId: z.enum(MUTATION_WORKFLOW_IDS),
    dryRun: z.literal(true),
    input: z.record(z.unknown()),
    note: z.string(),
  }),
  handler(input, ctx) {
    const parsed = mutationPlanInputSchema.parse(input);
    return ctx.respond({
      workflowId: parsed.workflowId,
      dryRun: true,
      input: parsed.input,
      note: "This is a plan only. Call plaky_execute_mutation_workflow with dryRun=false to perform writes.",
    });
  },
};
