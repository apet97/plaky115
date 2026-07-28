import { z } from "zod/v3";
import { int64Id } from "../../runtime/ids.js";

export const READ_WORKFLOW_IDS = ["workspace.map", "items.search", "comments.thread", "export.items"] as const;
export const MUTATION_WORKFLOW_IDS = [
  "items.create", "items.updateFields", "comments.add",
  "itemGroups.create", "itemGroups.update", "itemFiles.upload", "itemFiles.update",
] as const;
export const WORKFLOW_IDS = [...READ_WORKFLOW_IDS, ...MUTATION_WORKFLOW_IDS] as const;

export type ReadWorkflowId = (typeof READ_WORKFLOW_IDS)[number];
export type MutationWorkflowId = (typeof MUTATION_WORKFLOW_IDS)[number];
export type WorkflowId = (typeof WORKFLOW_IDS)[number];

const titleRef = z.string().min(1).refine((value) => !/^\d+$/.test(value), "numeric identifiers must be canonical signed int64 values");
const entityRefSchema = z.union([int64Id, titleRef]).describe("Exact numeric ID or non-empty title reference.");

export type EntityName = "space" | "board" | "item" | "itemGroup" | "itemFile";

function entityInput<T extends z.ZodRawShape>(required: readonly EntityName[], shape: T) {
  const refs: z.ZodRawShape = {};
  for (const name of required) {
    const label = name === "itemGroup" ? "Item Group" : name === "itemFile" ? "Item file" : name[0]!.toUpperCase() + name.slice(1);
    refs[name] = entityRefSchema.describe(`${label} ID or title (compatibility spelling).`).optional();
    refs[`${name}Id`] = entityRefSchema.describe(`${label} ID or title.`).optional();
  }
  return z.object({
    ...refs,
    ...shape,
  }).strict().superRefine((value, ctx) => {
    for (const name of required) {
      if (value[name] === undefined && value[`${name}Id`] === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `missing required input "${name}Id" (or "${name}")` });
      }
      if (value[name] !== undefined && value[`${name}Id`] !== undefined && value[name] !== value[`${name}Id`]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `conflicting inputs "${name}" and "${name}Id"` });
      }
    }
  });
}

const workspaceMapInputSchema = z.object({}).strict();
const itemSearchInputSchema = entityInput(["space", "board"], {
  query: z.string().describe("Item search query; empty matches every scanned item."),
  limit: z.number().int().positive().describe("Maximum items to scan.").optional(),
});
const itemCreateBodySchema = z.object({
  title: z.string().describe("Item title.").optional(),
  fields: z.record(z.unknown()).describe("Item field values keyed by title or key.").optional(),
  groupId: int64Id.describe("Target item group ID.").optional(),
  groupTitle: z.string().describe("Target item group title.").optional(),
  parentId: int64Id.describe("Parent item ID for a subitem.").optional(),
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
const itemGroupBodyBase = {
  title: z.string().min(1).describe("Item Group title."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe("RGB hexadecimal color.").optional(),
  ranking: z.string().min(1).describe("Lexicographical ranking value.").optional(),
};
const itemGroupCreateInputSchema = entityInput(["space", "board"], {
  body: z.object(itemGroupBodyBase).strict(),
});
const itemGroupUpdateInputSchema = entityInput(["space", "board", "itemGroup"], {
  body: z.object({ ...itemGroupBodyBase, ranking: z.string().min(1).describe("Lexicographical ranking value.") }).strict(),
});
const itemFileUploadInputSchema = entityInput(["space", "board", "item"], {
  fileBase64: z.string().describe("Canonical base64 content; omitted from dry-run receipts."),
  fileName: z.string().min(1).describe("File name."),
  contentType: z.string().describe("Optional media type.").optional(),
});
const itemFileUpdateInputSchema = entityInput(["space", "board", "item", "itemFile"], {
  body: z.object({ name: z.string().min(1), description: z.string().optional() }).strict(),
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
const itemGroupCreateVariant = z.object({ workflowId: z.literal("itemGroups.create"), input: itemGroupCreateInputSchema, dryRun: z.boolean().optional() }).strict();
const itemGroupUpdateVariant = z.object({ workflowId: z.literal("itemGroups.update"), input: itemGroupUpdateInputSchema, dryRun: z.boolean().optional() }).strict();
const itemFileUploadVariant = z.object({ workflowId: z.literal("itemFiles.upload"), input: itemFileUploadInputSchema, dryRun: z.boolean().optional() }).strict();
const itemFileUpdateVariant = z.object({ workflowId: z.literal("itemFiles.update"), input: itemFileUpdateInputSchema, dryRun: z.boolean().optional() }).strict();

const itemCreatePlanVariant = itemCreateVariant.omit({ dryRun: true });
const itemUpdateFieldsPlanVariant = itemUpdateFieldsVariant.omit({ dryRun: true });
const commentAddPlanVariant = commentAddVariant.omit({ dryRun: true });
const itemGroupCreatePlanVariant = itemGroupCreateVariant.omit({ dryRun: true });
const itemGroupUpdatePlanVariant = itemGroupUpdateVariant.omit({ dryRun: true });
const itemFileUploadPlanVariant = itemFileUploadVariant.omit({ dryRun: true });
const itemFileUpdatePlanVariant = itemFileUpdateVariant.omit({ dryRun: true });

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
  itemGroupCreateVariant,
  itemGroupUpdateVariant,
  itemFileUploadVariant,
  itemFileUpdateVariant,
]);
export const mutationPlanInputSchema = z.discriminatedUnion("workflowId", [
  itemCreatePlanVariant,
  itemUpdateFieldsPlanVariant,
  commentAddPlanVariant,
  itemGroupCreatePlanVariant,
  itemGroupUpdatePlanVariant,
  itemFileUploadPlanVariant,
  itemFileUpdatePlanVariant,
]);
export const executeWorkflowInputSchema = z.discriminatedUnion("workflowId", [
  workspaceMapVariant,
  itemSearchVariant,
  commentThreadVariant,
  exportItemsVariant,
  itemCreateVariant,
  itemUpdateFieldsVariant,
  commentAddVariant,
  itemGroupCreateVariant,
  itemGroupUpdateVariant,
  itemFileUploadVariant,
  itemFileUpdateVariant,
]);
