// Typed response shapes with branded IDs. Resource method return types use
// these so callers get SpaceId/BoardId/ItemId from list/get responses
// automatically — no asSpaceId(...) wrapping needed when chaining calls.
//
// At runtime these are the exact same JSON the API returns; the brand
// exists only at the TypeScript level. Field names and types mirror the
// generated schema types in ../generated/types.ts (the drift-checked source
// of truth) and the fields confirmed against the live API. Fields that the
// API does not actually emit are kept as `@deprecated` optionals for
// backwards compatibility rather than removed.
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

/** One user's reaction detail. Mirrors generated `ReactionDetails`. */
export type ReactionDetailShape = {
  /** ID of the user who left the reaction (numeric in the API response). */
  userId?: UserId | number | undefined;
  /** ISO-8601 timestamp of when the reaction was created. */
  reactedAt?: string | undefined;
};

/**
 * A reaction on a comment. Mirrors generated `ReactionResponse`: the API emits
 * `reactionCode` (the emoji's Unicode codepoint hex, e.g. `"1f44d"`) and
 * `reactedUsers`. The previous `emoji`/`count`/`reactedByCurrentUser`/`users`
 * fields are not emitted by the API and are kept only for compatibility.
 */
export type ReactionShape = {
  /** Emoji code, e.g. `"1f44d"`. Mirrors generated `ReactionResponse.reactionCode`. */
  reactionCode?: string | undefined;
  /** Users who left this reaction. Mirrors generated `ReactionResponse.reactedUsers`. */
  reactedUsers?: ReactionDetailShape[] | undefined;
  /** @deprecated Not emitted by the API; use {@link ReactionShape.reactionCode}. */
  emoji?: string | undefined;
  /** @deprecated Not emitted by the API. */
  count?: number | undefined;
  /** @deprecated Not emitted by the API. */
  reactedByCurrentUser?: boolean | undefined;
  /** @deprecated Not emitted by the API; use {@link ReactionShape.reactedUsers}. */
  users?: ShortUserShape[] | undefined;
};

/**
 * A comment on an item. Mirrors generated `CommentResponse`. The API response
 * field is `content`; `text` is kept as a request/compatibility alias. The API
 * returns `createdBy` as a numeric user id (no expansion); the previous
 * `author` object field is not emitted and is kept for compatibility.
 */
export type CommentShape = {
  id?: CommentId | undefined;
  /** Comment body as returned by the API. */
  content?: string | undefined;
  /** Compatibility alias for {@link CommentShape.content}; the request field is `text`. */
  text?: string | undefined;
  itemId?: ItemId | undefined;
  createdAt?: string | undefined;
  /** Null until the comment is edited. */
  updatedAt?: string | null | undefined;
  /** ID of the user who created the comment (numeric in the API response). */
  createdBy?: UserId | number | undefined;
  /** Whether the comment is softly deleted. */
  deleted?: boolean | undefined;
  /** Whether the comment is pinned. */
  pinned?: boolean | undefined;
  reactions?: ReactionShape[] | undefined;
  /** Replies to the comment. */
  replies?: CommentShape[] | undefined;
  /** @deprecated The API returns `createdBy` (a numeric user id), not an author object. */
  author?: ShortUserShape | undefined;
};

/**
 * An item. Mirrors generated `ItemResponse`. Relationship fields (`board`,
 * `space`, `group`, `parent`) are numeric ids by default and expand to full
 * objects when requested via `expand`. The previous `boardId`/`spaceId`/
 * `groupId`/`parentItemId` aliases are kept for compatibility.
 */
export type ItemShape = {
  id?: ItemId | undefined;
  title?: string | undefined;
  archived?: boolean | undefined;
  deleted?: boolean | undefined;
  /** Soft-deletion timestamp; null unless the item is deleted. */
  deletedAt?: string | null | undefined;
  /** Board id, or full board when expanded. Mirrors generated `ItemResponse.board`. */
  board?: BoardId | BoardShape | undefined;
  /** Space id, or full space when expanded. Mirrors generated `ItemResponse.space`. */
  space?: SpaceId | SpaceShape | undefined;
  /** Group id, or full group when expanded. Mirrors generated `ItemResponse.group`. */
  group?: number | string | ItemGroupShape | undefined;
  /** Parent item id, or full parent when expanded; null for top-level items. */
  parent?: ItemId | ItemShape | null | undefined;
  ranking?: string | undefined;
  fields?: ItemFieldShape[] | undefined;
  /** Number of comments on the item. */
  commentCount?: number | undefined;
  /** Number of files uploaded on the item. */
  fileCount?: number | undefined;
  /** Subitems; null when not embedded. */
  subitems?: ItemShape[] | null | undefined;
  subscribedTeams?: (TeamShape | number)[] | null | undefined;
  subscribedUsers?: (ShortUserShape | number)[] | null | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  /** Creator id (numeric in the API response), or full user when expanded. */
  createdBy?: ShortUserShape | UserId | number | undefined;
  /** @deprecated The API returns `board`; use {@link ItemShape.board}. */
  boardId?: BoardId | undefined;
  /** @deprecated The API returns `space`; use {@link ItemShape.space}. */
  spaceId?: SpaceId | undefined;
  /** @deprecated The API returns `group`; use {@link ItemShape.group}. */
  groupId?: number | string | undefined;
  /** @deprecated The API returns `parent`; use {@link ItemShape.parent}. */
  parentItemId?: ItemId | undefined;
};

/** Helper: pick the human label off a field, preferring name then title. */
export function fieldLabel(field: FieldShape | undefined): string | undefined {
  if (!field) return undefined;
  return field.name ?? field.title ?? undefined;
}
