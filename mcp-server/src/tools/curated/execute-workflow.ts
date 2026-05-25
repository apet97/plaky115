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
} from "plaky115";
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

type WorkflowId = (typeof WORKFLOW_IDS)[number];

export const executeWorkflowTool: McpToolDefinition = {
  name: "plaky_execute_workflow",
  title: "Execute a Plaky workflow",
  description: "Run a named curated workflow. Defaults to dryRun=true for mutation workflows.",
  scopes: ["read", "write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: z.object({
    workflowId: z.enum(WORKFLOW_IDS),
    input: z.record(z.unknown()).optional(),
    dryRun: z.boolean().optional(),
  }),
  async handler(input, ctx) {
    const { workflowId, input: payload, dryRun } = input as {
      workflowId: WorkflowId;
      input?: Record<string, unknown>;
      dryRun?: boolean;
    };
    const args = payload ?? {};
    switch (workflowId) {
      case "workspace.map": {
        const result = await workspaceMap(ctx.client);
        return ctx.respond(result, { compactKind: "raw" });
      }
      case "items.search": {
        const result = await searchItems(ctx.client, {
          space: args["space"] as EntityRef,
          board: args["board"] as EntityRef,
          query: String(args["query"] ?? ""),
          ...(args["limit"] !== undefined ? { limit: Number(args["limit"]) } : {}),
        });
        return ctx.respond({ data: result, hasMore: false }, { compactKind: "item" });
      }
      case "items.create": {
        if (dryRun !== false) {
          return ctx.respond({ workflowId, dryRun: true, input: args });
        }
        const space = args["space"] as EntityRef;
        const board = args["board"] as EntityRef;
        const body = args["body"] as Record<string, unknown>;
        const result = await ctx.client.items.create({
          spaceId: asSpaceId(space as string | number),
          boardId: asBoardId(board as string | number),
          body,
        });
        return ctx.respond(result, { compactKind: "item" });
      }
      case "items.updateFields": {
        const updates = (args["updates"] as Array<{ itemId: number | string; body: Record<string, unknown> }>) ?? [];
        const result = await bulkUpdateItems(ctx.client, {
          space: args["space"] as EntityRef,
          board: args["board"] as EntityRef,
          updates,
          dryRun: dryRun !== false,
        });
        return ctx.respond(result);
      }
      case "comments.add": {
        if (dryRun !== false) {
          return ctx.respond({ workflowId, dryRun: true, input: args });
        }
        const result = await ctx.client.comments.create({
          spaceId: asSpaceId(args["spaceId"] as string | number),
          boardId: asBoardId(args["boardId"] as string | number),
          itemId: asItemId(args["itemId"] as string | number),
          body: { text: String(args["text"] ?? "") },
        });
        return ctx.respond(result, { compactKind: "comment" });
      }
      case "comments.thread": {
        const result = await ctx.client.comments.listAll({
          spaceId: asSpaceId(args["spaceId"] as string | number),
          boardId: asBoardId(args["boardId"] as string | number),
          itemId: asItemId(args["itemId"] as string | number),
          ...(args["limit"] !== undefined ? { limit: Number(args["limit"]) } : {}),
        });
        return ctx.respond({ data: result, hasMore: false }, { compactKind: "comment" });
      }
      case "export.items": {
        const out = await exportItems(ctx.client, {
          space: args["space"] as EntityRef,
          board: args["board"] as EntityRef,
          format: (args["format"] as "jsonl" | "csv") ?? "jsonl",
        });
        return ctx.respond({ format: args["format"] ?? "jsonl", body: out });
      }
      default:
        throw new Error(`Unknown workflowId: ${String(workflowId)}`);
    }
  },
};
