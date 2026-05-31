import { z } from "zod/v3";
import type { McpToolDefinition } from "../../runtime/types.js";

const WORKFLOW_IDS = [
  "workspace.map",
  "items.search",
  "items.create",
  "items.updateFields",
  "comments.add",
  "comments.thread",
  "export.items",
] as const;

export type WorkflowId = (typeof WORKFLOW_IDS)[number];

export const planMutationTool: McpToolDefinition = {
  name: "plaky_plan_mutation",
  title: "Plan a Plaky mutation",
  description: "Return a compact dry-run plan for a named workflow without writing. Use before plaky_execute_workflow.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    workflowId: z.enum(WORKFLOW_IDS).describe("Curated workflow to plan without writing."),
    input: z.record(z.unknown()).describe("Workflow-specific arguments to validate and echo in the plan.").optional(),
  }),
  outputSchema: z.object({
    workflowId: z.enum(WORKFLOW_IDS),
    dryRun: z.literal(true),
    input: z.record(z.unknown()),
    note: z.string(),
  }),
  handler(input, ctx) {
    const { workflowId, input: payload } = input as { workflowId: WorkflowId; input?: Record<string, unknown> };
    return ctx.respond({
      workflowId,
      dryRun: true,
      input: payload ?? {},
      note: "This is a plan only. Call plaky_execute_workflow with dryRun=false to perform writes.",
    });
  },
};
