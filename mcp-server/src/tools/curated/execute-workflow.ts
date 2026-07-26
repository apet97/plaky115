import { z } from "zod/v3";
import {
  workspaceMap,
  searchItems,
  bulkUpdateItems,
  exportItems,
  asSpaceId,
  asBoardId,
  asItemId,
  type EntityRef,
  type ItemCreateBody,
} from "plaky115";
import type { McpToolContext, McpToolDefinition } from "../../runtime/types.js";

export const READ_WORKFLOW_IDS = ["workspace.map", "items.search", "comments.thread", "export.items"] as const;
export const MUTATION_WORKFLOW_IDS = ["items.create", "items.updateFields", "comments.add"] as const;
export const WORKFLOW_IDS = [...READ_WORKFLOW_IDS, ...MUTATION_WORKFLOW_IDS] as const;

export type ReadWorkflowId = (typeof READ_WORKFLOW_IDS)[number];
export type MutationWorkflowId = (typeof MUTATION_WORKFLOW_IDS)[number];
export type WorkflowId = (typeof WORKFLOW_IDS)[number];

const entityRefSchema = z.union([z.number().int(), z.string().min(1)]).describe("Exact numeric ID or non-empty title reference.");

function entityInput<T extends z.ZodRawShape>(required: readonly ("space" | "board" | "item")[], shape: T) {
  return z.object({
    space: entityRefSchema.describe("Space ID or title (compatibility spelling).").optional(),
    spaceId: entityRefSchema.describe("Space ID or title.").optional(),
    board: entityRefSchema.describe("Board ID or title (compatibility spelling).").optional(),
    boardId: entityRefSchema.describe("Board ID or title.").optional(),
    item: entityRefSchema.describe("Item ID (compatibility spelling).").optional(),
    itemId: entityRefSchema.describe("Item ID.").optional(),
    ...shape,
  }).strict().superRefine((value, ctx) => {
    for (const name of required) {
      if (value[name] === undefined && value[`${name}Id`] === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `missing required input "${name}Id" (or "${name}")` });
      }
    }
  });
}

const workspaceMapInputSchema = z.object({}).strict();
const itemSearchInputSchema = entityInput(["space", "board"], {
  query: z.string().min(1).describe("Non-empty item search query."),
  limit: z.number().int().nonnegative().describe("Maximum items to scan.").optional(),
});
const itemCreateBodySchema = z.object({
  title: z.string().describe("Item title.").optional(),
  fields: z.record(z.unknown()).describe("Item field values keyed by title or key.").optional(),
  groupId: z.number().int().describe("Target item group ID.").optional(),
  groupTitle: z.string().describe("Target item group title.").optional(),
  parentId: z.number().int().describe("Parent item ID for a subitem.").optional(),
}).strict();
const itemCreateInputSchema = entityInput(["space", "board"], {
  body: itemCreateBodySchema.describe("Exact ItemCreateRequest body."),
});
const itemUpdateFieldsInputSchema = entityInput(["space", "board"], {
  updates: z.array(z.object({
    itemId: entityRefSchema.describe("Item ID to update."),
    body: z.record(z.unknown()).describe("Field update body keyed by field title or key."),
  }).strict()).min(1).describe("One or more item field updates."),
});
const commentAddInputSchema = entityInput(["space", "board", "item"], {
  text: z.string().min(1).describe("Non-empty comment text."),
});
const commentThreadInputSchema = entityInput(["space", "board", "item"], {
  limit: z.number().int().nonnegative().describe("Maximum comments to return.").optional(),
});
const exportItemsInputSchema = entityInput(["space", "board"], {
  format: z.enum(["jsonl", "csv"]).describe("Export format.").optional(),
});

const workspaceMapVariant = z.object({
  workflowId: z.literal("workspace.map").describe("Map the workspace."),
  input: workspaceMapInputSchema.describe("No workflow-specific fields.").optional(),
}).strict();
const itemSearchVariant = z.object({
  workflowId: z.literal("items.search").describe("Search items."),
  input: itemSearchInputSchema.describe("Exact item-search input."),
}).strict();
const commentThreadVariant = z.object({
  workflowId: z.literal("comments.thread").describe("Read an item comment thread."),
  input: commentThreadInputSchema.describe("Exact comment-thread input."),
}).strict();
const exportItemsVariant = z.object({
  workflowId: z.literal("export.items").describe("Export board items."),
  input: exportItemsInputSchema.describe("Exact export input."),
}).strict();
const itemCreateVariant = z.object({
  workflowId: z.literal("items.create").describe("Create an item."),
  input: itemCreateInputSchema.describe("Exact item-create input."),
  dryRun: z.boolean().describe("Preview unless explicitly false.").optional(),
}).strict();
const itemUpdateFieldsVariant = z.object({
  workflowId: z.literal("items.updateFields").describe("Update fields on multiple items."),
  input: itemUpdateFieldsInputSchema.describe("Exact bulk-update input."),
  dryRun: z.boolean().describe("Preview unless explicitly false.").optional(),
}).strict();
const commentAddVariant = z.object({
  workflowId: z.literal("comments.add").describe("Add an item comment."),
  input: commentAddInputSchema.describe("Exact comment-add input."),
  dryRun: z.boolean().describe("Preview unless explicitly false.").optional(),
}).strict();

const itemCreatePlanVariant = itemCreateVariant.omit({ dryRun: true });
const itemUpdateFieldsPlanVariant = itemUpdateFieldsVariant.omit({ dryRun: true });
const commentAddPlanVariant = commentAddVariant.omit({ dryRun: true });

export const readWorkflowInputSchema = z.discriminatedUnion("workflowId", [
  workspaceMapVariant,
  itemSearchVariant,
  commentThreadVariant,
  exportItemsVariant,
]);
export const mutationWorkflowInputSchema = z.discriminatedUnion("workflowId", [
  itemCreateVariant,
  itemUpdateFieldsVariant,
  commentAddVariant,
]);
export const mutationPlanInputSchema = z.discriminatedUnion("workflowId", [
  itemCreatePlanVariant,
  itemUpdateFieldsPlanVariant,
  commentAddPlanVariant,
]);
export const executeWorkflowInputSchema = z.discriminatedUnion("workflowId", [
  workspaceMapVariant,
  itemSearchVariant,
  commentThreadVariant,
  exportItemsVariant,
  itemCreateVariant,
  itemUpdateFieldsVariant,
  commentAddVariant,
]);

export const executeWorkflowTool: McpToolDefinition = {
  name: "plaky_execute_workflow",
  title: "Execute a Plaky workflow (deprecated)",
  description: "Deprecated compatibility tool for exact read and mutation workflows. Prefer plaky_execute_read_workflow or plaky_execute_mutation_workflow.",
  scopes: ["read", "write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: executeWorkflowInputSchema,
  outputSchema: z.object({}).passthrough(),
  async handler(input, ctx) {
    return executeWorkflow(executeWorkflowInputSchema.parse(input), ctx);
  },
};

export async function executeWorkflow(
  input: z.infer<typeof executeWorkflowInputSchema>,
  ctx: McpToolContext,
): Promise<unknown> {
  const workflowId = input.workflowId;
  const args = (input.input ?? {}) as Record<string, unknown>;
  const dryRun = "dryRun" in input ? input.dryRun : undefined;
  if (isMutationWorkflow(workflowId) && dryRun !== false) {
    return ctx.respond({ workflowId, dryRun: true, input: args });
  }

  switch (workflowId) {
    case "workspace.map":
      return ctx.respond(await workspaceMap(ctx.client), { compactKind: "raw" });
    case "items.search": {
      // W002: replace this compile-safe searchItems adapter with searchItemsDetailed.
      const result = await searchItems(ctx.client, {
        space: readRef(args, "space") as EntityRef,
        board: readRef(args, "board") as EntityRef,
        query: args["query"] as string,
        ...(args["limit"] !== undefined ? { limit: args["limit"] as number } : {}),
      });
      return ctx.respond({ data: result, hasMore: false }, { compactKind: "item" });
    }
    case "items.create":
      return ctx.respond(await ctx.client.items.create({
        spaceId: asSpaceId(readRef(args, "space")),
        boardId: asBoardId(readRef(args, "board")),
        body: args["body"] as ItemCreateBody,
      }), { compactKind: "item" });
    case "items.updateFields":
      return ctx.respond(await bulkUpdateItems(ctx.client, {
        space: readRef(args, "space") as EntityRef,
        board: readRef(args, "board") as EntityRef,
        updates: args["updates"] as Array<{ itemId: string | number; body: Record<string, unknown> }>,
        dryRun: false,
      }));
    case "comments.add":
      return ctx.respond(await ctx.client.comments.create({
        spaceId: asSpaceId(readRef(args, "space")),
        boardId: asBoardId(readRef(args, "board")),
        itemId: asItemId(readRef(args, "item")),
        body: { text: args["text"] as string },
      }), { compactKind: "comment" });
    case "comments.thread": {
      const result = await ctx.client.comments.listAll({
        spaceId: asSpaceId(readRef(args, "space")),
        boardId: asBoardId(readRef(args, "board")),
        itemId: asItemId(readRef(args, "item")),
        ...(args["limit"] !== undefined ? { limit: args["limit"] as number } : {}),
      });
      return ctx.respond({ data: result, hasMore: false }, { compactKind: "comment" });
    }
    case "export.items": {
      const format = (args["format"] as "jsonl" | "csv" | undefined) ?? "jsonl";
      const body = await exportItems(ctx.client, {
        space: readRef(args, "space") as EntityRef,
        board: readRef(args, "board") as EntityRef,
        format,
      });
      return ctx.respond({ format, body });
    }
  }
}

function readRef(args: Record<string, unknown>, name: "space" | "board" | "item"): string | number {
  return (args[name] ?? args[`${name}Id`]) as string | number;
}

function isMutationWorkflow(workflowId: WorkflowId): workflowId is MutationWorkflowId {
  return (MUTATION_WORKFLOW_IDS as readonly string[]).includes(workflowId);
}
