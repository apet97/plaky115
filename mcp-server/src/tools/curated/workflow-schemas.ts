import { z } from "zod/v3";
import { int64Id } from "../../runtime/ids.js";
import { workflowDefinition, workflowRegistry, type WorkflowId as RegistryWorkflowId } from "./workflow-registry.js";

function nonEmptyWorkflowIds(ids: readonly RegistryWorkflowId[]): [RegistryWorkflowId, ...RegistryWorkflowId[]] {
  if (ids.length === 0) throw new Error("curated workflow registry must not be empty");
  return ids as [RegistryWorkflowId, ...RegistryWorkflowId[]];
}

export const READ_WORKFLOW_IDS = nonEmptyWorkflowIds(workflowRegistry.filter((workflow) => !workflow.mutation).map((workflow) => workflow.id));
export const MUTATION_WORKFLOW_IDS = nonEmptyWorkflowIds(workflowRegistry.filter((workflow) => workflow.mutation).map((workflow) => workflow.id));
export const WORKFLOW_IDS = nonEmptyWorkflowIds(workflowRegistry.map((workflow) => workflow.id));

type ReadWorkflowDefinition = Extract<(typeof workflowRegistry)[number], { mutation: false }>;
type MutationWorkflowDefinition = Extract<(typeof workflowRegistry)[number], { mutation: true }>;
export type ReadWorkflowId = ReadWorkflowDefinition["id"];
export type MutationWorkflowId = MutationWorkflowDefinition["id"];
export type WorkflowId = RegistryWorkflowId;

function workflowLiteral<const T extends RegistryWorkflowId>(id: T) {
  return z.literal(id).describe(workflowDefinition(id).description);
}

const titleRef = z.string().min(1).refine((value) => !/^\d+$/.test(value), "numeric identifiers must be canonical signed int64 values");
const selectorObject = z.object({
  id: int64Id.optional(),
  title: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.id === undefined && value.title === undefined && value.name === undefined && value.email === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "selector must include id, title, name, or email" });
  }
  const labels = [value.title === undefined ? undefined : "title", value.name === undefined ? undefined : "name", value.email === undefined ? undefined : "email"];
  const present = labels.filter((label): label is string => label !== undefined);
  if (present.length > 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `selector fields conflict: ${present.join(", ")}` });
});
const entityRefSchema = z.union([int64Id, titleRef, selectorObject]).describe("Exact numeric ID, text reference, or field-specific selector.");

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
const cursorSchema = z.object({
  page: z.number().int().positive(),
  index: z.number().int().nonnegative(),
}).strict().describe("Exact page and zero-based item index at which to continue.");
const itemSearchInputSchema = entityInput(["space", "board"], {
  query: z.string().describe("Item search query; empty matches every scanned item."),
  limit: z.number().int().positive().describe("Maximum items to scan.").optional(),
  cursor: cursorSchema.optional(),
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
  maxItems: z.number().int().positive().describe("Maximum items in one export chunk.").optional(),
  maxBytes: z.number().int().positive().describe("Maximum UTF-8 bytes in one export chunk.").optional(),
  cursor: cursorSchema.optional(),
});
const itemGroupBodyBase = {
  title: z.string().min(1).describe("Item Group title."),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).describe("RGB hexadecimal color."),
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
  workflowId: workflowLiteral("workspace.map"),
  input: workspaceMapInputSchema.describe("No workflow-specific fields.").optional(),
}).strict();
const itemSearchVariant = z.object({
  workflowId: workflowLiteral("items.search"),
  input: itemSearchInputSchema.describe("Exact item-search input."),
}).strict();
const commentThreadVariant = z.object({
  workflowId: workflowLiteral("comments.thread"),
  input: commentThreadInputSchema.describe("Exact comment-thread input."),
}).strict();
const exportItemsVariant = z.object({
  workflowId: workflowLiteral("export.items"),
  input: exportItemsInputSchema.describe("Exact export input."),
}).strict();
const itemCreateVariant = z.object({
  workflowId: workflowLiteral("items.create"),
  input: itemCreateInputSchema.describe("Exact item-create input."),
  dryRun: z.boolean().describe("Preview unless explicitly false.").optional(),
}).strict();
const itemUpdateFieldsVariant = z.object({
  workflowId: workflowLiteral("items.updateFields"),
  input: itemUpdateFieldsInputSchema.describe("Exact bulk-update input."),
  dryRun: z.boolean().describe("Preview unless explicitly false.").optional(),
}).strict();
const commentAddVariant = z.object({
  workflowId: workflowLiteral("comments.add"),
  input: commentAddInputSchema.describe("Exact comment-add input."),
  dryRun: z.boolean().describe("Preview unless explicitly false.").optional(),
}).strict();
const itemGroupCreateVariant = z.object({ workflowId: workflowLiteral("itemGroups.create"), input: itemGroupCreateInputSchema, dryRun: z.boolean().optional() }).strict();
const itemGroupUpdateVariant = z.object({ workflowId: workflowLiteral("itemGroups.update"), input: itemGroupUpdateInputSchema, dryRun: z.boolean().optional() }).strict();
const itemFileUploadVariant = z.object({ workflowId: workflowLiteral("itemFiles.upload"), input: itemFileUploadInputSchema, dryRun: z.boolean().optional() }).strict();
const itemFileUpdateVariant = z.object({ workflowId: workflowLiteral("itemFiles.update"), input: itemFileUpdateInputSchema, dryRun: z.boolean().optional() }).strict();

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
