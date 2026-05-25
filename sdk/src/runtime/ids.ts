// Branded ID types. Use the matching constructor at every call site so the
// SDK enforces "don't pass a BoardId where a SpaceId is expected" at the
// type level. Runtime cost is zero — the brand exists only in TypeScript.
export type Branded<T, B extends string> = T & { readonly __brand: B };

export type SpaceId = Branded<string | number, "SpaceId">;
export type BoardId = Branded<string | number, "BoardId">;
export type ItemId = Branded<string | number, "ItemId">;
export type CommentId = Branded<string | number, "CommentId">;
export type FieldKey = Branded<string, "FieldKey">;
export type UserId = Branded<string | number, "UserId">;
export type TeamId = Branded<string | number, "TeamId">;

export const SpaceId = (v: string | number): SpaceId => v as SpaceId;
export const BoardId = (v: string | number): BoardId => v as BoardId;
export const ItemId = (v: string | number): ItemId => v as ItemId;
export const CommentId = (v: string | number): CommentId => v as CommentId;
export const FieldKey = (v: string): FieldKey => v as FieldKey;
export const UserId = (v: string | number): UserId => v as UserId;
export const TeamId = (v: string | number): TeamId => v as TeamId;

// Helpers for places where the API returns a raw id we want to use directly.
export const asSpaceId = (v: string | number): SpaceId => SpaceId(v);
export const asBoardId = (v: string | number): BoardId => BoardId(v);
export const asItemId = (v: string | number): ItemId => ItemId(v);
export const asCommentId = (v: string | number): CommentId => CommentId(v);
export const asUserId = (v: string | number): UserId => UserId(v);
export const asTeamId = (v: string | number): TeamId => TeamId(v);
