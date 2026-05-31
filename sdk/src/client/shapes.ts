// Typed response shapes with branded IDs. Resource method return types use
// these so callers get SpaceId/BoardId/ItemId from list/get responses
// automatically — no asSpaceId(...) wrapping needed when chaining calls.
//
// At runtime these are the exact same JSON the API returns; the brand
// exists only at the TypeScript level. Field coverage reflects what the
// live API actually emits (verified by scripts/live-workspace-sweep.mjs).
import type { SpaceId, BoardId, ItemId, CommentId, UserId, TeamId } from "../runtime/ids.js";

export type PagedResult<T> = {
  data?: T[] | undefined;
  hasMore?: boolean | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

/** A field definition on a board. Plaky uses `name` here, not `title`. */
export type FieldShape = {
  id?: number | string | undefined;
  key?: string | undefined;
  name?: string | undefined;
  description?: string | null | undefined;
  type?: string | undefined;
  configuration?: Record<string, unknown> | undefined;
  /** Some endpoints surface `title` instead of `name`. Treat as optional fallback. */
  title?: string | undefined;
  /** Field value when the shape appears under an item. */
  value?: unknown;
};

export type ItemFieldShape = FieldShape & {
  itemId?: ItemId | undefined;
};

export type ItemGroupShape = {
  id?: number | string | undefined;
  title?: string | undefined;
  color?: string | undefined;
  ranking?: string | undefined;
};

/** "PUBLIC" | "PRIVATE" — left open in case Plaky adds more. */
export type BoardKind = string;

export type BoardShape = {
  id?: BoardId | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  fields?: FieldShape[] | undefined;
  groups?: ItemGroupShape[] | undefined;
  space?: SpaceId | undefined;
  spaceId?: SpaceId | undefined;
  kind?: BoardKind | undefined;
  defaultBoard?: boolean | undefined;
  defaultValues?: unknown;
  editPermissionsMode?: string | undefined;
  folder?: string | null | undefined;
  ranking?: string | undefined;
  template?: boolean | undefined;
};

/** "OPEN" | "CLOSED" — left open. */
export type SpaceKind = string;

export type SpaceShape = {
  id?: SpaceId | undefined;
  title?: string | undefined;
  description?: string | undefined;
  boards?: BoardShape[] | undefined;
  kind?: SpaceKind | undefined;
  defaultSpace?: boolean | undefined;
  iconUrl?: string | null | undefined;
};

export type ShortUserShape = {
  id?: UserId | undefined;
  name?: string | undefined;
  email?: string | undefined;
  avatarUrl?: string | null | undefined;
};

export type UserShape = ShortUserShape & {
  role?: string | undefined;
  timezone?: string | undefined;
  createdAt?: string | undefined;
  status?: string | undefined;
};

export type TeamShape = {
  id?: TeamId | undefined;
  title?: string | undefined;
  name?: string | undefined;
  description?: string | null | undefined;
  members?: ShortUserShape[] | undefined;
};

export type ReactionShape = {
  emoji?: string | undefined;
  count?: number | undefined;
  reactedByCurrentUser?: boolean | undefined;
  users?: ShortUserShape[] | undefined;
};

export type CommentShape = {
  id?: CommentId | undefined;
  content?: string | undefined;
  text?: string | undefined;
  itemId?: ItemId | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  author?: ShortUserShape | undefined;
  reactions?: ReactionShape[] | undefined;
};

export type ItemShape = {
  id?: ItemId | undefined;
  title?: string | undefined;
  archived?: boolean | undefined;
  deleted?: boolean | undefined;
  boardId?: BoardId | undefined;
  spaceId?: SpaceId | undefined;
  groupId?: number | string | undefined;
  ranking?: string | undefined;
  parentItemId?: ItemId | undefined;
  fields?: ItemFieldShape[] | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  createdBy?: ShortUserShape | undefined;
};

/** Helper: pick the human label off a field, preferring name then title. */
export function fieldLabel(field: FieldShape | undefined): string | undefined {
  if (!field) return undefined;
  return field.name ?? field.title ?? undefined;
}
