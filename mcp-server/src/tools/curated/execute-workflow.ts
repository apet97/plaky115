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
  normalizeCommentPlan,
  normalizeItemCreatePlan,
  normalizeItemFileUpdatePlan,
  normalizeItemGroupCreatePlan,
  normalizeItemGroupUpdatePlan,
  normalizeItemUpdateFieldsPlan,
  type EntityRef,
  type ItemCreateBody,
} from "plaky115";
import type { McpToolContext, McpToolDefinition } from "../../runtime/types.js";
import { createProgressReporter } from "../../runtime/progress.js";
import {
  buildFileUploadFormDataFromNormalized,
  estimateBase64DecodedBytes,
  resolveMaxUploadBytes,
} from "../../runtime/upload.js";
import { normalizeUpload, type NormalizedUpload } from "plaky115";

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
  const normalizedUpload = workflowId === "itemFiles.upload"
    ? await normalizeUpload({
      fileBase64: args["fileBase64"] as string,
      fileName: args["fileName"] as string,
      ...(args["contentType"] === undefined ? {} : { contentType: args["contentType"] as string }),
    }, resolveMaxUploadBytes())
    : undefined;
  const resolvedArgs = isMutationWorkflow(workflowId)
    ? await resolveMutationInput(workflowId, args, ctx)
    : args;
  if (isMutationWorkflow(workflowId) && dryRun !== false) {
    return ctx.respond({ workflowId, dryRun: true, input: mutationPlanReceiptInput(workflowId, resolvedArgs, normalizedUpload) });
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
    case "items.create": {
      const result = await ctx.attempt.mutate({
        operation: workflowId,
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId"),
        createdIdKey: "itemId",
        run: () => ctx.client.items.create({
          spaceId: asSpaceId(readRef(resolvedArgs, "space")),
          boardId: asBoardId(readRef(resolvedArgs, "board")),
          body: resolvedArgs["body"] as ItemCreateBody,
        }, { signal: ctx.signal }),
      });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, ctx));
    }
    case "items.updateFields":
      {
      const updates = resolvedArgs["updates"] as Array<{ itemId: string | number; body: Record<string, unknown> }>;
      const progress = createProgressReporter(ctx.progress, updates.length, "items updated");
      const receipts = await bulkUpdateItems(ctx.client, {
        space: readRef(resolvedArgs, "space") as EntityRef,
        board: readRef(resolvedArgs, "board") as EntityRef,
        updates,
        dryRun: false,
        throwOnError: true,
        signal: ctx.signal,
        onProgress: (completed) => progress(completed),
      });
      ctx.attempt.record(receipts);
      return ctx.respond({
        workflowId,
        status: "completed",
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId"),
        receipts,
        result: receipts,
      });
      }
    case "comments.add": {
      const result = await ctx.attempt.mutate({
        operation: workflowId,
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId", "itemId"),
        createdIdKey: "commentId",
        run: () => ctx.client.comments.create({
          spaceId: asSpaceId(readRef(resolvedArgs, "space")),
          boardId: asBoardId(readRef(resolvedArgs, "board")),
          itemId: asItemId(readRef(resolvedArgs, "item")),
          body: { text: resolvedArgs["text"] as string },
        }, { signal: ctx.signal }),
      });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, ctx));
    }
    case "itemGroups.create": {
      const result = await ctx.attempt.mutate({
        operation: workflowId,
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId"),
        createdIdKey: "itemGroupId",
        run: () => ctx.client.itemGroups.create({
          spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
          body: resolvedArgs["body"] as { title: string; color: string; ranking?: string },
        }, { signal: ctx.signal }),
      });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, ctx));
    }
    case "itemGroups.update": {
      const result = await ctx.attempt.mutate({
        operation: workflowId,
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId", "itemGroupId"),
        run: () => ctx.client.itemGroups.update({
          spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
          itemGroupId: readRef(resolvedArgs, "itemGroup"),
          body: resolvedArgs["body"] as { title: string; ranking: string; color: string },
        }, { signal: ctx.signal }),
      });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, ctx));
    }
    case "itemFiles.upload": {
      if (normalizedUpload === undefined) throw new Error("upload normalization was not prepared");
      const form = buildFileUploadFormDataFromNormalized(normalizedUpload);
      const file = form.get("file");
      if (!(file instanceof Blob)) throw new Error("validated upload did not produce a file");
      const result = await ctx.attempt.mutate({
        operation: workflowId,
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId", "itemId"),
        createdIdKey: "itemFileId",
        run: () => ctx.client.itemFiles.upload({
          spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
          itemId: asItemId(readRef(resolvedArgs, "item")), file, fileName: resolvedArgs["fileName"] as string,
        }, { signal: ctx.signal }),
      });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, ctx));
    }
    case "itemFiles.update": {
      const result = await ctx.attempt.mutate({
        operation: workflowId,
        targetIds: mutationTargetIds(resolvedArgs, "spaceId", "boardId", "itemId", "itemFileId"),
        run: () => ctx.client.itemFiles.update({
          spaceId: asSpaceId(readRef(resolvedArgs, "space")), boardId: asBoardId(readRef(resolvedArgs, "board")),
          itemId: asItemId(readRef(resolvedArgs, "item")), itemFileId: readRef(resolvedArgs, "itemFile"),
          body: resolvedArgs["body"] as { name: string; description?: string },
        }, { signal: ctx.signal }),
      });
      return ctx.respond(mutationReceipt(workflowId, resolvedArgs, result, ctx));
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
    const itemIds = updates.every((update) => entityId(update.itemId) !== undefined)
      ? updates.map((update) => entityId(update.itemId)!)
      : (await resolveItemsInBoard(ctx.client, {
        spaceId: readRef(resolved, "space"),
        boardId: readRef(resolved, "board"),
        items: updates.map((update) => update.itemId),
      }, { signal: ctx.signal })).map((item) => exactId(item, "item"));
    const normalizedUpdates = updates.map((update, index) => {
      const itemId = itemIds[index]!;
      const normalized = normalizeItemUpdateFieldsPlan({
        spaceId: resolved["spaceId"] as string | number,
        boardId: resolved["boardId"] as string | number,
        itemId,
        body: update.body,
      });
      return { itemId, body: normalized.body };
    });
    return {
      ...resolved,
      updates: normalizedUpdates,
    };
  }
  if (workflowId === "itemGroups.update") {
    const resolved = await resolveEntityPath(args, false, ctx);
    const itemGroupRef = readRef(args, "itemGroup");
    const itemGroupId = entityId(itemGroupRef) ?? exactId(await resolveItemGroupInBoard(ctx.client, {
      spaceId: readRef(resolved, "space"), boardId: readRef(resolved, "board"), itemGroup: itemGroupRef,
    }, { signal: ctx.signal }), "item group");
    const normalized = normalizeItemGroupUpdatePlan({
      spaceId: resolved["spaceId"] as string | number,
      boardId: resolved["boardId"] as string | number,
      itemGroupId,
      body: args["body"],
    });
    return { ...resolved, itemGroupId, body: normalized.body };
  }
  if (workflowId === "itemFiles.update") {
    const resolved = await resolveEntityPath(args, true, ctx);
    const itemFileRef = readRef(args, "itemFile");
    const itemFileId = entityId(itemFileRef) ?? exactId(await resolveItemFileOnItem(ctx.client, {
      spaceId: readRef(resolved, "space"), boardId: readRef(resolved, "board"), itemId: readRef(resolved, "item"),
      itemFile: itemFileRef,
    }, { signal: ctx.signal }), "item file");
    const normalized = normalizeItemFileUpdatePlan({
      spaceId: resolved["spaceId"] as string | number,
      boardId: resolved["boardId"] as string | number,
      itemId: resolved["itemId"] as string | number,
      itemFileId,
      body: args["body"],
    });
    return { ...resolved, itemFileId, body: normalized.body };
  }
  const resolved = await resolveEntityPath(args, workflowId === "comments.add" || workflowId.startsWith("itemFiles."), ctx);
  if (workflowId === "items.create") {
    const sourceBody = args["body"] as Record<string, unknown>;
    let body: Record<string, unknown> = sourceBody;
    if (sourceBody["groupTitle"] !== undefined) {
      if (sourceBody["groupId"] !== undefined) throw new TypeError("body.groupId and body.groupTitle cannot both be provided");
      const group = await resolveItemGroupInBoard(ctx.client, {
        spaceId: resolved["spaceId"] as string | number,
        boardId: resolved["boardId"] as string | number,
        itemGroup: { title: sourceBody["groupTitle"] as string },
      }, { signal: ctx.signal });
      const itemGroupId = exactId(group, "item group");
      const { groupTitle: _groupTitle, ...withoutGroupTitle } = sourceBody;
      body = { ...withoutGroupTitle, groupId: itemGroupId };
    }
    const normalized = normalizeItemCreatePlan({
      spaceId: resolved["spaceId"] as string | number,
      boardId: resolved["boardId"] as string | number,
      body,
    });
    return { ...resolved, body: normalized.body };
  }
  if (workflowId === "comments.add") {
    const normalized = normalizeCommentPlan({
      spaceId: resolved["spaceId"] as string | number,
      boardId: resolved["boardId"] as string | number,
      itemId: resolved["itemId"] as string | number,
      body: { text: args["text"] },
    });
    return { ...resolved, text: normalized.body["text"] };
  }
  if (workflowId === "itemGroups.create") {
    const normalized = normalizeItemGroupCreatePlan({
      spaceId: resolved["spaceId"] as string | number,
      boardId: resolved["boardId"] as string | number,
      body: args["body"],
    });
    return { ...resolved, body: normalized.body };
  }
  return resolved;
}

export function mutationPlanReceiptInput(workflowId: MutationWorkflowId, args: Record<string, unknown>, normalizedUpload?: NormalizedUpload): Record<string, unknown> {
  if (workflowId !== "itemFiles.upload") return args;
  const { fileBase64, ...safe } = args;
  return {
    ...safe,
    decodedBytes: normalizedUpload?.decodedBytes ?? estimateBase64DecodedBytes(fileBase64 as string),
    ...(normalizedUpload === undefined ? {} : { mediaType: normalizedUpload.mediaType, sha256: normalizedUpload.sha256 }),
  };
}

async function resolveEntityPath(
  args: Record<string, unknown>,
  includeItem: boolean,
  ctx: McpToolContext,
): Promise<Record<string, unknown>> {
  const spaceRef = readRef(args, "space") as EntityRef;
  const boardRef = readRef(args, "board") as EntityRef;
  const directSpaceId = entityId(spaceRef);
  const directBoardId = entityId(boardRef);
  const resolvedScope = directSpaceId !== undefined && directBoardId !== undefined
    ? { space: { id: directSpaceId }, board: { id: directBoardId } }
    : await resolveSpaceAndBoard(ctx.client, { space: spaceRef, board: boardRef }, { signal: ctx.signal });
  const resolved: Record<string, unknown> = {
    ...withoutAliases(args),
    spaceId: exactId(resolvedScope.space, "space"),
    boardId: exactId(resolvedScope.board, "board"),
  };
  if (includeItem) {
    const itemRef = readRef(args, "item") as EntityRef;
    const directItemId = entityId(itemRef);
    if (directItemId !== undefined) resolved["itemId"] = directItemId;
    else {
      const [item] = await resolveItemsInBoard(ctx.client, {
        spaceId: resolved["spaceId"] as string,
        boardId: resolved["boardId"] as string,
        items: [itemRef],
      }, { signal: ctx.signal });
      resolved["itemId"] = exactId(item, "item");
    }
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

function entityId(value: EntityRef): string | undefined {
  const candidate = typeof value === "object" && value !== null ? (value as { id?: unknown }).id : value;
  if (typeof candidate === "number") {
    if (!Number.isSafeInteger(candidate) || candidate < 0) throw new TypeError("identifier must be a safe non-negative integer; pass larger identifiers as decimal strings");
    return String(candidate);
  }
  if (typeof candidate === "string" && /^(0|[1-9]\d*)$/.test(candidate)) {
    if (BigInt(candidate) > 9_223_372_036_854_775_807n) throw new TypeError("identifier exceeds signed int64 range");
    return candidate;
  }
  if (typeof candidate === "string" && /^\d+$/.test(candidate)) throw new TypeError("identifier must be a canonical non-negative decimal string");
  return undefined;
}

function mutationReceipt(
  workflowId: MutationWorkflowId,
  resolved: Record<string, unknown>,
  result: unknown,
  ctx: McpToolContext,
): Record<string, unknown> {
  const receipts = ctx.attempt.snapshot().receipts;
  const receipt = receipts[0];
  return {
    workflowId,
    status: receipt?.status ?? "completed",
    targetIds: receipt?.targetIds ?? mutationTargetIds(resolved, "spaceId", "boardId", "itemId", "itemGroupId", "itemFileId"),
    receipts,
    result,
  };
}

function mutationTargetIds(resolved: Record<string, unknown>, ...keys: string[]): Record<string, string> {
  return Object.fromEntries(
    keys
      .filter((key) => resolved[key] !== undefined)
      .map((key) => [key, String(resolved[key])]),
  );
}

function readRef(args: Record<string, unknown>, name: EntityName): string | number {
  return (args[name] ?? args[`${name}Id`]) as string | number;
}

function isMutationWorkflow(workflowId: WorkflowId): workflowId is MutationWorkflowId {
  return (MUTATION_WORKFLOW_IDS as readonly string[]).includes(workflowId);
}
