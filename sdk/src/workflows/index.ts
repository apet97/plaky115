import type { PlakyClient } from "../client/client.js";
import { resolveBoard, resolveSpace, type EntityRef } from "../resolvers/index.js";
import { asSpaceId, asBoardId, asItemId } from "../runtime/ids.js";

type WithIdTitle = { id?: number | string | undefined; title?: string | undefined; name?: string | undefined };

export async function workspaceMap(client: PlakyClient): Promise<Array<{ id: number | string | undefined; title: string | undefined; boards: WithIdTitle[] }>> {
  const spaces = (await client.spaces.listAll()) as WithIdTitle[];
  const out = [];
  for (const space of spaces) {
    const boards = space.id !== undefined
      ? ((await client.boards.listAll({ spaceId: asSpaceId(space.id) })) as WithIdTitle[])
      : [];
    out.push({ id: space.id, title: space.title, boards });
  }
  return out;
}

export type SearchItemsParams = {
  space: EntityRef;
  board: EntityRef;
  query: string;
  limit?: number;
};

export async function searchItems(client: PlakyClient, params: SearchItemsParams): Promise<WithIdTitle[]> {
  const board = await resolveBoard(client, { space: params.space, board: params.board });
  const space = await resolveSpace(client, params.space);
  const items = (await client.items.listAll({
    spaceId: asSpaceId(space.id!),
    boardId: asBoardId(board.id!),
    limit: params.limit ?? 200,
  })) as WithIdTitle[];
  const needle = params.query.toLowerCase();
  return items.filter((it) => (it.title ?? it.name ?? "").toLowerCase().includes(needle));
}

export type BulkUpdateParams = {
  space: EntityRef;
  board: EntityRef;
  updates: Array<{ itemId: number | string; body: Record<string, unknown> }>;
  dryRun?: boolean;
};

export async function bulkUpdateItems(client: PlakyClient, params: BulkUpdateParams): Promise<Array<{ itemId: number | string; status: "dry-run" | "updated" | "error"; detail?: unknown }>> {
  const board = await resolveBoard(client, { space: params.space, board: params.board });
  const space = await resolveSpace(client, params.space);
  const out = [];
  for (const update of params.updates) {
    if (params.dryRun === true) {
      out.push({ itemId: update.itemId, status: "dry-run" as const });
      continue;
    }
    try {
      await client.items.updateFields({
        spaceId: asSpaceId(space.id!),
        boardId: asBoardId(board.id!),
        itemId: asItemId(update.itemId),
        body: update.body,
      });
      out.push({ itemId: update.itemId, status: "updated" as const });
    } catch (err) {
      out.push({ itemId: update.itemId, status: "error" as const, detail: (err as Error).message });
    }
  }
  return out;
}

export type ExportItemsParams = {
  space: EntityRef;
  board: EntityRef;
  format: "jsonl" | "csv";
};

export async function exportItems(client: PlakyClient, params: ExportItemsParams): Promise<string> {
  const board = await resolveBoard(client, { space: params.space, board: params.board });
  const space = await resolveSpace(client, params.space);
  const items = (await client.items.listAll({ spaceId: asSpaceId(space.id!), boardId: asBoardId(board.id!) })) as Array<Record<string, unknown>>;
  if (params.format === "jsonl") {
    return items.map((i) => JSON.stringify(i)).join("\n");
  }
  if (items.length === 0) return "";
  const keys = Array.from(new Set(items.flatMap((i) => Object.keys(i))));
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = keys.join(",");
  const rows = items.map((i) => keys.map((k) => escape(i[k])).join(","));
  return [header, ...rows].join("\n");
}
