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
  description: "Run a named curated workflow. Defaults to dryRun=true for mutation workflows. Entity inputs accept either spelling: `space`/`board`/`item` or `spaceId`/`boardId`/`itemId`.",
  scopes: ["read", "write"],
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: z.object({
    workflowId: z.enum(WORKFLOW_IDS).describe("Curated workflow to run."),
    input: z.record(z.unknown()).describe("Workflow-specific arguments such as space, board, item, body, or query.").optional(),
    dryRun: z.boolean().describe("Keep mutation workflows in preview mode unless explicitly false.").optional(),
  }),
  outputSchema: z.object({}).passthrough(),
  async handler(input, ctx) {
    const { workflowId, input: payload, dryRun } = input as {
      workflowId: WorkflowId;
      input?: Record<string, unknown>;
      dryRun?: boolean;
    };
    const args = payload ?? {};
    // Accept either spelling for entity references (`space`/`board`/`item` or
    // `spaceId`/`boardId`/`itemId`) so a key learned from one workflow works in
    // all of them. `reqId` fails fast with a clear message instead of letting an
    // undefined id reach the API as `/spaces/undefined`.
    const ref = (k: "space" | "board" | "item"): unknown => args[k] ?? args[`${k}Id`];
    const reqId = (k: "space" | "board" | "item"): string | number => {
      const v = ref(k);
      if (v === undefined || v === null || v === "") {
        throw new Error(`${workflowId}: missing required input "${k}Id" (or "${k}")`);
      }
      return v as string | number;
    };
    switch (workflowId) {
      case "workspace.map": {
        const result = await workspaceMap(ctx.client);
        return ctx.respond(result, { compactKind: "raw" });
      }
      case "items.search": {
        const result = await searchItems(ctx.client, {
          space: ref("space") as EntityRef,
          board: ref("board") as EntityRef,
          query: String(args["query"] ?? ""),
          ...(args["limit"] !== undefined ? { limit: Number(args["limit"]) } : {}),
        });
        return ctx.respond({ data: result, hasMore: false }, { compactKind: "item" });
      }
      case "items.create": {
        if (dryRun !== false) {
          return ctx.respond({ workflowId, dryRun: true, input: args });
        }
        const result = await ctx.client.items.create({
          spaceId: asSpaceId(reqId("space")),
          boardId: asBoardId(reqId("board")),
          body: args["body"] as Record<string, unknown>,
        });
        return ctx.respond(result, { compactKind: "item" });
      }
      case "items.updateFields": {
        const updates = (args["updates"] as Array<{ itemId: number | string; body: Record<string, unknown> }>) ?? [];
        const result = await bulkUpdateItems(ctx.client, {
          space: ref("space") as EntityRef,
          board: ref("board") as EntityRef,
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
          spaceId: asSpaceId(reqId("space")),
          boardId: asBoardId(reqId("board")),
          itemId: asItemId(reqId("item")),
          body: { text: String(args["text"] ?? "") },
        });
        return ctx.respond(result, { compactKind: "comment" });
      }
      case "comments.thread": {
        const result = await ctx.client.comments.listAll({
          spaceId: asSpaceId(reqId("space")),
          boardId: asBoardId(reqId("board")),
          itemId: asItemId(reqId("item")),
          ...(args["limit"] !== undefined ? { limit: Number(args["limit"]) } : {}),
        });
        return ctx.respond({ data: result, hasMore: false }, { compactKind: "comment" });
      }
      case "export.items": {
        const out = await exportItems(ctx.client, {
          space: ref("space") as EntityRef,
          board: ref("board") as EntityRef,
          format: (args["format"] as "jsonl" | "csv") ?? "jsonl",
        });
        return ctx.respond({ format: args["format"] ?? "jsonl", body: out });
      }
      default:
        throw new Error(`Unknown workflowId: ${String(workflowId)}`);
    }
  },
};
