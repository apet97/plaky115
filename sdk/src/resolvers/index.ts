import type { PlakyClient } from "../client/client.js";
import { PlakyAmbiguousMatchError, PlakyNotFoundError } from "../runtime/errors.js";
import { asSpaceId, asBoardId, asItemId } from "../runtime/ids.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";

type WithId = { id?: number | string | undefined; title?: string | undefined; name?: string | undefined; email?: string | undefined };

export type EntityRef = number | string | WithId;

function asId(ref: EntityRef): { id?: string; needle?: string } {
  if (typeof ref === "number") return { id: canonicalId(ref) };
  if (typeof ref === "string") {
    if (/^\d+$/.test(ref)) return { id: canonicalId(ref) };
    return { needle: ref.toLowerCase() };
  }
  if (ref && typeof ref === "object" && ref.id !== undefined) return { id: canonicalId(ref.id) };
  return {};
}

function pick<T extends WithId>(items: T[], match: { id?: string; needle?: string }, label: string): T {
  if (match.id !== undefined) {
    const found = items.find((it) => it.id !== undefined && canonicalId(it.id) === match.id);
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

function canonicalId(value: number | string): string {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("identifier must be a safe non-negative integer; pass larger identifiers as decimal strings");
    }
    return String(value);
  }
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error("identifier must be a canonical non-negative decimal string");
  }
  if (BigInt(value) > 9_223_372_036_854_775_807n) {
    throw new Error("identifier exceeds signed int64 range");
  }
  return value;
}

function localNotFound(message: string): PlakyNotFoundError {
  return new PlakyNotFoundError(message, {
    status: 404,
    method: "LOCAL",
    url: "plaky115://resolver",
    headers: new Headers(),
  });
}

export async function resolveSpace(client: PlakyClient, ref: EntityRef, options?: PlakyRequestOverrides): Promise<WithId> {
  const match = asId(ref);
  if (match.id !== undefined) {
    return getById(() => client.spaces.get(match.id!, options), match.id, "space");
  }
  const all = await client.spaces.listAll({}, options);
  return pick(all as WithId[], match, "space");
}

/**
 * Resolve a space and one of its boards in a single pass. Resolves the space
 * once and reuses it to list the board, avoiding the redundant second
 * `spaces.listAll()` that calling `resolveSpace` and `resolveBoard` separately
 * would incur. Exact numeric references use direct GETs; title references use
 * the corresponding paged listing.
 *
 * @param options - Per-request overrides, including cancellation.
 */
export async function resolveSpaceAndBoard(
  client: PlakyClient,
  params: { space: EntityRef; board: EntityRef },
  options?: PlakyRequestOverrides,
): Promise<{ space: WithId; board: WithId }> {
  const space = await resolveSpace(client, params.space, options);
  const match = asId(params.board);
  if (match.id !== undefined) {
    return {
      space,
      board: await getById(
        () => client.boards.get({ spaceId: asSpaceId(space.id!), boardId: match.id! }, options),
        match.id,
        "board",
      ),
    };
  }
  const boards = await client.boards.listAll({ spaceId: asSpaceId(space.id!) }, options);
  return { space, board: pick(boards as WithId[], match, "board") };
}

export async function resolveBoard(client: PlakyClient, params: { space: EntityRef; board: EntityRef }, options?: PlakyRequestOverrides): Promise<WithId> {
  return (await resolveSpaceAndBoard(client, params, options)).board;
}

export async function resolveUser(client: PlakyClient, ref: EntityRef, options?: PlakyRequestOverrides): Promise<WithId> {
  const match = asId(ref);
  const all = await client.users.listAll({}, options);
  return pick(all as WithId[], match, "user");
}

export async function resolveTeam(client: PlakyClient, ref: EntityRef, options?: PlakyRequestOverrides): Promise<WithId> {
  const match = asId(ref);
  if (match.id !== undefined) {
    return getById(() => client.teams.get(match.id!, options), match.id, "team");
  }
  const all = await client.teams.listAll({}, options);
  return pick(all as WithId[], match, "team");
}

export async function resolveItem(client: PlakyClient, params: { space: EntityRef; board: EntityRef; item: EntityRef }, options?: PlakyRequestOverrides): Promise<WithId> {
  const { space, board } = await resolveSpaceAndBoard(client, { space: params.space, board: params.board }, options);
  const match = asId(params.item);
  if (match.id !== undefined) {
    return getById(
      () => client.items.get({ spaceId: asSpaceId(space.id!), boardId: asBoardId(board.id!), itemId: match.id! }, options),
      match.id,
      "item",
    );
  }
  return (await resolveItemsInBoard(client, {
    spaceId: space.id!,
    boardId: board.id!,
    items: [params.item],
  }, options))[0]!;
}

/** Resolve multiple item references against one board listing. A single exact ID uses direct GET. */
export async function resolveItemsInBoard(
  client: PlakyClient,
  params: { spaceId: number | string; boardId: number | string; items: EntityRef[] },
  options?: PlakyRequestOverrides,
): Promise<WithId[]> {
  const refs = params.items.map(asId);
  if (refs.length === 1 && refs[0]?.id !== undefined) {
    return [await getById(
      () => client.items.get({ spaceId: asSpaceId(params.spaceId), boardId: asBoardId(params.boardId), itemId: refs[0]!.id! }, options),
      refs[0].id,
      "item",
    )];
  }
  const items = await client.items.listAll({ spaceId: asSpaceId(params.spaceId), boardId: asBoardId(params.boardId) }, options);
  return refs.map((match) => pick(items as WithId[], match, "item"));
}

export async function resolveItemGroupInBoard(
  client: PlakyClient,
  params: { spaceId: number | string; boardId: number | string; itemGroup: EntityRef },
  options?: PlakyRequestOverrides,
): Promise<WithId> {
  const match = asId(params.itemGroup);
  if (match.id !== undefined) {
    return getById(
      () => client.itemGroups.get({ spaceId: asSpaceId(params.spaceId), boardId: asBoardId(params.boardId), itemGroupId: match.id! }, options),
      match.id,
      "item group",
    );
  }
  const groups = await client.itemGroups.listAll({ spaceId: asSpaceId(params.spaceId), boardId: asBoardId(params.boardId) }, options);
  return pick(groups as WithId[], match, "item group");
}

export async function resolveItemFileOnItem(
  client: PlakyClient,
  params: { spaceId: number | string; boardId: number | string; itemId: number | string; itemFile: EntityRef },
  options?: PlakyRequestOverrides,
): Promise<WithId> {
  const match = asId(params.itemFile);
  if (match.id !== undefined) {
    return getById(
      () => client.itemFiles.get({
        spaceId: asSpaceId(params.spaceId), boardId: asBoardId(params.boardId), itemId: asItemId(params.itemId), itemFileId: match.id!,
      }, options),
      match.id,
      "item file",
    );
  }
  const files = await client.itemFiles.list({
    spaceId: asSpaceId(params.spaceId), boardId: asBoardId(params.boardId), itemId: asItemId(params.itemId),
  }, options);
  return pick(files as WithId[], match, "item file");
}

async function getById<T extends WithId>(get: () => Promise<T>, id: string, label: string): Promise<T> {
  try {
    return pick([await get()], { id }, label);
  } catch (error) {
    if (error instanceof PlakyNotFoundError) throw localNotFound(`${label} not found: id=${id}`);
    throw error;
  }
}
