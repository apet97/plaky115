import { z } from "zod/v3";
import {
  workspaceMap,
  searchItemsDetailed,
  bulkUpdateItems,
  exportItems,
  asSpaceId,
  asBoardId,
  asItemId,
  resolveSpaceAndBoard,
  resolveItemsInBoard,
  resolveItemGroupInBoard,
  resolveItemFileOnItem,
  type EntityRef,
  type ItemCreateBody,
} from "plaky115";
import type { McpToolContext, McpToolDefinition } from "../../runtime/types.js";
import { createProgressReporter } from "../../runtime/progress.js";
import { buildFileUploadFormData, estimateBase64DecodedBytes } from "../../runtime/upload.js";

import {
  MUTATION_WORKFLOW_IDS,
  executeWorkflowInputSchema,
  type EntityName,
  type MutationWorkflowId,
  type WorkflowId,
} from "./workflow-schemas.js";

export {
  MUTATION_WORKFLOW_IDS,
  READ_WORKFLOW_IDS,
  WORKFLOW_IDS,
  executeWorkflowInputSchema,
  mutationPlanInputSchema,
  mutationWorkflowInputSchema,
  readWorkflowInputSchema,
} from "./workflow-schemas.js";

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
  const resolvedArgs = isMutationWorkflow(workflowId)
    ? await resolveMutationInput(workflowId, args, ctx)
    : args;
  if (isMutationWorkflow(workflowId) && dryRun !== false) {
    return ctx.respond({ workflowId, dryRun: true, input: mutationPlanReceiptInput(workflowId, resolvedArgs) });
  }

  switch (workflowId) {
    case "workspace.map":
      return ctx.respond(await workspaceMap(ctx.client, { signal: ctx.signal }), { compactKind: "raw" });
    case "items.search": {
      const limit = (args["limit"] as number | undefined) ?? 200;
      const progress = createProgressReporter(ctx.progress, limit, "items scanned");
      const result = await searchItemsDetailed(ctx.client, {
        space: readRef(args, "space") as EntityRef,
        board: readRef(args, "board") as EntityRef,
        query: args["query"] as string,
        limit,
        signal: ctx.signal,
        onProgress: (scanned) => progress(scanned),
      });
      return ctx.respond(result);
    }
    case "items.create":
      return ctx.respond(await ctx.client.items.create({
        spaceId: asSpaceId(readRef(resolvedArgs, "space")),
        boardId: asBoardId(readRef(resolvedArgs, "board")),
        body: resolvedArgs["body"] as ItemCreateBody,
      }, { signal: ctx.signal }), { compactKind: "item" });
    case "items.updateFields":
      {
      const updates = resolvedArgs["updates"] as Array<{ itemId: string | number; body: Record<string, unknown> }>;
      const progress = createProgressReporter(ctx.progress, updates.length, "items updated");
      return ctx.respond(await bulkUpdateItems(ctx.client, {
        space: readRef(resolvedArgs, "space") as EntityRef,
        board: readRef(resolvedArgs, "board") as EntityRef,
        updates,
        dryRun: false,
        throwOnError: true,
        signal: ctx.signal,
        onProgress: (completed) => progress(completed),
      }));
      }
    case "comments.add":
      return ctx.respond(await ctx.client.comments.create({
        spaceId: asSpaceId(readRef(resolvedArgs, "space")),
        boardId: asBoardId(readRef(resolvedArgs, "board")),
        itemId: asItemId(readRef(resolvedArgs, "item")),
        body: { text: resolvedArgs["text"] as string },
      }, { signal: ctx.signal }), { compactKind: "comment" });
    case "itemGroups.create": {
      const result = await ctx.client.itemGroups.create({
        spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
        body: resolvedArgs["body"] as { title: string; color: string; ranking?: string },
      }, { signal: ctx.signal });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, "itemGroupId"));
    }
    case "itemGroups.update": {
      const result = await ctx.client.itemGroups.update({
        spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
        itemGroupId: readRef(resolvedArgs, "itemGroup"),
        body: resolvedArgs["body"] as { title: string; ranking: string; color: string },
      }, { signal: ctx.signal });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result));
    }
    case "itemFiles.upload": {
      const form = buildFileUploadFormData({
        fileBase64: resolvedArgs["fileBase64"] as string,
        fileName: resolvedArgs["fileName"] as string,
        ...(resolvedArgs["contentType"] !== undefined ? { contentType: resolvedArgs["contentType"] as string } : {}),
      });
      const file = form.get("file");
      if (!(file instanceof Blob)) throw new Error("validated upload did not produce a file");
      const result = await ctx.client.itemFiles.upload({
        spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
        itemId: asItemId(readRef(resolvedArgs, "item")), file, fileName: resolvedArgs["fileName"] as string,
      }, { signal: ctx.signal });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, "itemFileId"));
    }
    case "itemFiles.update": {
      const result = await ctx.client.itemFiles.update({
        spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
        itemId: asItemId(readRef(resolvedArgs, "item")), itemFileId: readRef(resolvedArgs, "itemFile"),
        body: resolvedArgs["body"] as { name: string; description?: string },
      }, { signal: ctx.signal });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result));
    }
    case "comments.thread": {
      const resolved = await resolveEntityPath(args, true, ctx);
      const result = await ctx.client.comments.listAll({
        spaceId: asSpaceId(readRef(resolved, "space")),
        boardId: asBoardId(readRef(resolved, "board")),
        itemId: asItemId(readRef(resolved, "item")),
        ...(args["limit"] !== undefined ? { limit: args["limit"] as number } : {}),
      }, { signal: ctx.signal });
      return ctx.respond({ data: result, hasMore: false }, { compactKind: "comment" });
    }
    case "export.items": {
      const format = (args["format"] as "jsonl" | "csv" | undefined) ?? "jsonl";
      const body = await exportItems(ctx.client, {
        space: readRef(args, "space") as EntityRef,
        board: readRef(args, "board") as EntityRef,
        format,
        signal: ctx.signal,
      });
      return ctx.respond({ format, body });
    }
  }
}

export async function resolveMutationInput(
  workflowId: MutationWorkflowId,
  args: Record<string, unknown>,
  ctx: McpToolContext,
): Promise<Record<string, unknown>> {
  if (workflowId === "items.updateFields") {
    const resolved = await resolveEntityPath(args, false, ctx);
    const updates = args["updates"] as Array<{ itemId: EntityRef; body: Record<string, unknown> }>;
    const items = await resolveItemsInBoard(ctx.client, {
      spaceId: readRef(resolved, "space"),
      boardId: readRef(resolved, "board"),
      items: updates.map((update) => update.itemId),
    }, { signal: ctx.signal });
    return {
      ...resolved,
      updates: updates.map((update, index) => ({ ...update, itemId: exactId(items[index], "item") })),
    };
  }
  if (workflowId === "itemGroups.update") {
    const resolved = await resolveEntityPath(args, false, ctx);
    const itemGroup = await resolveItemGroupInBoard(ctx.client, {
      spaceId: readRef(resolved, "space"), boardId: readRef(resolved, "board"), itemGroup: readRef(args, "itemGroup"),
    }, { signal: ctx.signal });
    return { ...resolved, itemGroupId: exactId(itemGroup, "item group") };
  }
  if (workflowId === "itemFiles.update") {
    const resolved = await resolveEntityPath(args, true, ctx);
    const itemFile = await resolveItemFileOnItem(ctx.client, {
      spaceId: readRef(resolved, "space"), boardId: readRef(resolved, "board"), itemId: readRef(resolved, "item"),
      itemFile: readRef(args, "itemFile"),
    }, { signal: ctx.signal });
    return { ...resolved, itemFileId: exactId(itemFile, "item file") };
  }
  return resolveEntityPath(args, workflowId === "comments.add" || workflowId.startsWith("itemFiles."), ctx);
}

export function mutationPlanReceiptInput(workflowId: MutationWorkflowId, args: Record<string, unknown>): Record<string, unknown> {
  if (workflowId !== "itemFiles.upload") return args;
  const { fileBase64, ...safe } = args;
  return { ...safe, decodedBytes: estimateBase64DecodedBytes(fileBase64 as string) };
}

async function resolveEntityPath(
  args: Record<string, unknown>,
  includeItem: boolean,
  ctx: McpToolContext,
): Promise<Record<string, unknown>> {
  const { space, board } = await resolveSpaceAndBoard(ctx.client, {
    space: readRef(args, "space") as EntityRef,
    board: readRef(args, "board") as EntityRef,
  }, { signal: ctx.signal });
  const resolved: Record<string, unknown> = {
    ...withoutAliases(args),
    spaceId: exactId(space, "space"),
    boardId: exactId(board, "board"),
  };
  if (includeItem) {
    const [item] = await resolveItemsInBoard(ctx.client, {
      spaceId: exactId(space, "space"),
      boardId: exactId(board, "board"),
      items: [readRef(args, "item") as EntityRef],
    }, { signal: ctx.signal });
    resolved["itemId"] = exactId(item, "item");
  }
  return resolved;
}

function withoutAliases(args: Record<string, unknown>): Record<string, unknown> {
  const {
    space: _space, board: _board, item: _item, itemGroup: _itemGroup, itemFile: _itemFile,
    spaceId: _spaceId, boardId: _boardId, itemId: _itemId, itemGroupId: _itemGroupId, itemFileId: _itemFileId,
    ...rest
  } = args;
  return rest;
}

function exactId(value: { id?: string | number | undefined } | undefined, label: string): string {
  if (value?.id === undefined) throw new Error(`${label} resolver returned no ID`);
  return String(value.id);
}

function mutationReceipt(
  workflowId: MutationWorkflowId,
  resolved: Record<string, unknown>,
  result: { id?: string | number | undefined },
  createdId?: "itemGroupId" | "itemFileId",
): Record<string, unknown> {
  const targetIds = Object.fromEntries(
    ["spaceId", "boardId", "itemId", "itemGroupId", "itemFileId"]
      .filter((key) => resolved[key] !== undefined)
      .map((key) => [key, resolved[key]]),
  );
  if (createdId && result.id !== undefined) targetIds[createdId] = String(result.id);
  return { workflowId, status: "completed", targetIds, result };
}

function readRef(args: Record<string, unknown>, name: EntityName): string | number {
  return (args[name] ?? args[`${name}Id`]) as string | number;
}

function isMutationWorkflow(workflowId: WorkflowId): workflowId is MutationWorkflowId {
  return (MUTATION_WORKFLOW_IDS as readonly string[]).includes(workflowId);
}
