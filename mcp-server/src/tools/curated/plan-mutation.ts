import { z } from "zod/v3";
import type { McpToolDefinition } from "../../runtime/types.js";
import { MUTATION_WORKFLOW_IDS, mutationPlanInputSchema, mutationPlanReceiptInput, resolveMutationInput } from "./execute-workflow.js";
import { normalizeUpload, type NormalizedUpload } from "plaky115";
import { resolveMaxUploadBytes } from "../../runtime/upload.js";

export const planMutationTool: McpToolDefinition = {
  name: "plaky_plan_mutation",
  title: "Plan a Plaky mutation",
  description: "Validate, resolve exact targets, and return a safe dry-run plan for a supported mutation workflow.",
  scopes: ["read"],
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  inputSchema: mutationPlanInputSchema,
  outputSchema: z.object({
    workflowId: z.enum(MUTATION_WORKFLOW_IDS),
    dryRun: z.literal(true),
    input: z.record(z.unknown()),
    note: z.string(),
  }),
  async handler(input, ctx) {
    const parsed = mutationPlanInputSchema.parse(input);
    const normalizedUpload: NormalizedUpload | undefined = parsed.workflowId === "itemFiles.upload"
      ? await normalizeUpload({
        fileBase64: parsed.input.fileBase64 as string,
        fileName: parsed.input.fileName as string,
        ...(parsed.input.contentType === undefined ? {} : { contentType: parsed.input.contentType as string }),
      }, resolveMaxUploadBytes())
      : undefined;
    const resolved = await resolveMutationInput(parsed.workflowId, parsed.input, ctx);
    return ctx.respond({
      workflowId: parsed.workflowId,
      dryRun: true,
      input: mutationPlanReceiptInput(parsed.workflowId, resolved, normalizedUpload),
      note: "This is a plan only. Call plaky_execute_mutation_workflow with dryRun=false to perform one write.",
    });
  },
};
