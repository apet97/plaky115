import type { PlakyClient } from "../client/client.js";
import { resolveSpaceAndBoard, type EntityRef } from "../resolvers/index.js";
import { asSpaceId, asBoardId, asItemId } from "../runtime/ids.js";
import type { ItemShape } from "../client/shapes.js";

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

export async function searchItems(client: PlakyClient, params: SearchItemsParams): Promise<ItemShape[]> {
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
  const items = (await client.items.listAll({
    spaceId: asSpaceId(space.id!),
    boardId: asBoardId(board.id!),
    limit: params.limit ?? 200,
  })) as ItemShape[];
  const needle = params.query.toLowerCase();
  // Match the item title or any field value — in Plaky most searchable content
  // lives in fields, not the title. `limit` caps items scanned, not matches.
  return items.filter((it) => {
    if ((it.title ?? "").toLowerCase().includes(needle)) return true;
    return (it.fields ?? []).some((f) => String(f?.value ?? "").toLowerCase().includes(needle));
  });
}

export type BulkUpdateParams = {
  space: EntityRef;
  board: EntityRef;
  updates: Array<{ itemId: number | string; body: Record<string, unknown> }>;
  dryRun?: boolean;
};

export async function bulkUpdateItems(client: PlakyClient, params: BulkUpdateParams): Promise<Array<{ itemId: number | string; status: "dry-run" | "updated" | "error"; detail?: unknown }>> {
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
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
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
  const items = (await client.items.listAll({ spaceId: asSpaceId(space.id!), boardId: asBoardId(board.id!) })) as Array<Record<string, unknown>>;
  if (params.format === "jsonl") {
    return items.map((i) => JSON.stringify(i)).join("\n");
  }
  if (items.length === 0) return "";
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    // Match Go encoding/csv's quoting rule: quote on comma, double-quote, CR, LF,
    // or a leading whitespace rune.
    return /[",\r\n]/.test(s) || /^\s/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Expand each item's `fields[]` into real per-field columns (labeled by the
  // first non-empty string among name/title/key); other top-level scalars keep
  // their own columns. Column order is deterministic and identical to the Go CLI:
  // sorted top-level keys (excluding `fields`), then sorted field labels; a field
  // label equal to a top-level key shares that column (field value wins). The
  // output (including the trailing newline) is byte-identical to the Go CLI's
  // `items-export --format csv` for scalar (string/number/boolean) values; a
  // non-scalar field value is JSON-stringified and may differ in object-key order
  // from the Go side (json.Marshal sorts keys).
  const topKeys = new Set<string>();
  const fieldLabels = new Set<string>();
  const rows = items.map((item) => {
    const row: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(item)) {
      if (k === "fields") continue;
      topKeys.add(k);
      row[k] = v;
    }
    const fields = item["fields"];
    if (Array.isArray(fields)) {
      for (const f of fields as Array<Record<string, unknown>>) {
        const label = ([f?.["name"], f?.["title"], f?.["key"]].find((v) => typeof v === "string" && v !== "") as string | undefined) ?? "";
        if (label === "") continue;
        fieldLabels.add(label);
        row[label] = f?.["value"];
      }
    }
    return row;
  });
  const header = Array.from(new Set([...Array.from(topKeys).sort(), ...Array.from(fieldLabels).sort()]));
  const lines = [header.map(escape).join(",")];
  for (const row of rows) lines.push(header.map((col) => escape(row[col])).join(","));
  return `${lines.join("\n")}\n`;
}
