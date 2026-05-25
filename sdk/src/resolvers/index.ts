import type { PlakyClient } from "../client/client.js";
import { PlakyAmbiguousMatchError, PlakyNotFoundError } from "../runtime/errors.js";
import { asSpaceId, asBoardId } from "../runtime/ids.js";

type WithId = { id?: number | string | undefined; title?: string | undefined; name?: string | undefined; email?: string | undefined };

export type EntityRef = number | string | WithId;

function asId(ref: EntityRef): { id?: number | string; needle?: string } {
  if (typeof ref === "number") return { id: ref };
  if (typeof ref === "string") {
    const num = Number(ref);
    return Number.isInteger(num) && String(num) === ref ? { id: num } : { needle: ref.toLowerCase() };
  }
  if (ref && typeof ref === "object" && ref.id !== undefined) return { id: ref.id };
  return {};
}

function pick<T extends WithId>(items: T[], match: { id?: number | string; needle?: string }, label: string): T {
  if (match.id !== undefined) {
    const found = items.find((it) => it.id === match.id || String(it.id) === String(match.id));
    if (!found) throw new PlakyNotFoundError(`${label} not found: id=${match.id}`, 404);
    return found;
  }
  if (match.needle) {
    const needle = match.needle;
    const candidates = items.filter((it) => {
      const text = `${it.title ?? it.name ?? it.email ?? ""}`.toLowerCase();
      return text.includes(needle);
    });
    if (candidates.length === 0) throw new PlakyNotFoundError(`${label} not found: ${needle}`, 404);
    if (candidates.length > 1) throw new PlakyAmbiguousMatchError(`${label} ambiguous: ${needle}`, candidates);
    return candidates[0]!;
  }
  throw new PlakyNotFoundError(`${label}: empty ref`, 404);
}

export async function resolveSpace(client: PlakyClient, ref: EntityRef): Promise<WithId> {
  const match = asId(ref);
  const all = await client.spaces.listAll();
  return pick(all as WithId[], match, "space");
}

export async function resolveBoard(client: PlakyClient, params: { space: EntityRef; board: EntityRef }): Promise<WithId> {
  const space = await resolveSpace(client, params.space);
  const spaceId = space.id!;
  const match = asId(params.board);
  const boards = await client.boards.listAll({ spaceId: asSpaceId(spaceId) });
  return pick(boards as WithId[], match, "board");
}

export async function resolveUser(client: PlakyClient, ref: EntityRef): Promise<WithId> {
  const match = asId(ref);
  const all = await client.users.listAll();
  return pick(all as WithId[], match, "user");
}

export async function resolveTeam(client: PlakyClient, ref: EntityRef): Promise<WithId> {
  const match = asId(ref);
  const all = await client.teams.listAll();
  return pick(all as WithId[], match, "team");
}

export async function resolveItem(client: PlakyClient, params: { space: EntityRef; board: EntityRef; item: EntityRef }): Promise<WithId> {
  const board = await resolveBoard(client, { space: params.space, board: params.board });
  const spaceRef = await resolveSpace(client, params.space);
  const match = asId(params.item);
  const items = await client.items.listAll({ spaceId: asSpaceId(spaceRef.id!), boardId: asBoardId(board.id!) });
  return pick(items as WithId[], match, "item");
}
