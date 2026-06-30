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
    if (!found) throw localNotFound(`${label} not found: id=${match.id}`);
    return found;
  }
  if (match.needle) {
    const needle = match.needle;
    const candidates = items.filter((it) => {
      const text = `${it.title ?? it.name ?? it.email ?? ""}`.toLowerCase();
      return text.includes(needle);
    });
    if (candidates.length === 0) throw localNotFound(`${label} not found: ${needle}`);
    if (candidates.length > 1) throw new PlakyAmbiguousMatchError(`${label} ambiguous: ${needle}`, candidates);
    return candidates[0]!;
  }
  throw localNotFound(`${label}: empty ref`);
}

function localNotFound(message: string): PlakyNotFoundError {
  return new PlakyNotFoundError(message, {
    status: 404,
    method: "LOCAL",
    url: "plaky115://resolver",
    headers: new Headers(),
  });
}

export async function resolveSpace(client: PlakyClient, ref: EntityRef): Promise<WithId> {
  const match = asId(ref);
  const all = await client.spaces.listAll();
  return pick(all as WithId[], match, "space");
}

/**
 * Resolve a space and one of its boards in a single pass. Resolves the space
 * once and reuses it to list the board, avoiding the redundant second
 * `spaces.listAll()` that calling `resolveSpace` and `resolveBoard` separately
 * would incur.
 */
export async function resolveSpaceAndBoard(
  client: PlakyClient,
  params: { space: EntityRef; board: EntityRef },
): Promise<{ space: WithId; board: WithId }> {
  const space = await resolveSpace(client, params.space);
  const match = asId(params.board);
  const boards = await client.boards.listAll({ spaceId: asSpaceId(space.id!) });
  return { space, board: pick(boards as WithId[], match, "board") };
}

export async function resolveBoard(client: PlakyClient, params: { space: EntityRef; board: EntityRef }): Promise<WithId> {
  return (await resolveSpaceAndBoard(client, params)).board;
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
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board });
  const match = asId(params.item);
  const items = await client.items.listAll({ spaceId: asSpaceId(space.id!), boardId: asBoardId(board.id!) });
  return pick(items as WithId[], match, "item");
}
