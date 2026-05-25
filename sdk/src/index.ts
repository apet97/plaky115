export { PlakyClient, DEFAULT_SERVER_URL } from "./client/client.js";
export type { PlakyClientOptions } from "./client/client.js";

export { SpacesResource } from "./client/spaces.js";
export { BoardsResource } from "./client/boards.js";
export { ItemsResource } from "./client/items.js";
export type {
  ItemListParams,
  ItemCreateParams,
  ItemUpdateFieldParams,
  ItemUpdateFieldsParams,
  ItemDeleteParams,
} from "./client/items.js";
export { ItemCommentsResource } from "./client/item-comments.js";
export type { CommentScopeParams } from "./client/item-comments.js";
export { ReactionsResource } from "./client/reactions.js";
export type { ReplaceReactionsParams } from "./client/reactions.js";
export { UsersResource } from "./client/users.js";
export { TeamsResource } from "./client/teams.js";

export {
  PlakyApiError,
  PlakyValidationError,
  PlakyNotFoundError,
  PlakyRateLimitError,
  PlakyAuthError,
  PlakyAmbiguousMatchError,
} from "./runtime/errors.js";

export { newIdempotencyKey } from "./runtime/idempotency.js";
export { verifyWebhookSignature } from "./runtime/webhooks.js";
export type { WebhookVerifyOptions } from "./runtime/webhooks.js";
export { redact, redactRecord } from "./runtime/redact.js";
export { withRetries } from "./runtime/retries.js";
export type { RetryOptions } from "./runtime/retries.js";
export type { Interceptors, RequestInterceptorContext, ResponseInterceptorContext } from "./runtime/interceptors.js";
export { RateLimitSink } from "./runtime/rate-limit.js";
export type { RateLimitSnapshot } from "./runtime/rate-limit.js";
export { paginate } from "./runtime/pagination.js";
export type { Page, PageFetcher, PageOptions, PaginatedIterator } from "./runtime/pagination.js";
export type { PlakyRequestOptions } from "./runtime/http.js";

export {
  SpaceId,
  BoardId,
  ItemId,
  CommentId,
  FieldKey,
  UserId,
  TeamId,
  asSpaceId,
  asBoardId,
  asItemId,
  asCommentId,
  asUserId,
  asTeamId,
} from "./runtime/ids.js";
export type {
  SpaceId as SpaceIdType,
  BoardId as BoardIdType,
  ItemId as ItemIdType,
  CommentId as CommentIdType,
  FieldKey as FieldKeyType,
  UserId as UserIdType,
  TeamId as TeamIdType,
  Branded,
} from "./runtime/ids.js";

export { operationTable } from "./generated/operation-table.js";
export type { OperationId } from "./generated/operation-table.js";

export type {
  PagedResult,
  FieldShape,
  ItemFieldShape,
  ItemGroupShape,
  BoardKind,
  BoardShape,
  SpaceKind,
  SpaceShape,
  ShortUserShape,
  UserShape,
  TeamShape,
  ReactionShape,
  CommentShape,
  ItemShape,
} from "./client/shapes.js";
export { fieldLabel } from "./client/shapes.js";

export type { DryRunPlan } from "./client/items.js";

export { fieldValues, omitUndefined } from "./fields/values.js";
export type { FieldValues } from "./fields/values.js";
export {
  stringField,
  statusField,
  tagField,
  personField,
  timelineField,
  linkField,
  numberField,
} from "./fields/builders.js";
export type {
  PersonRef,
  TeamRef,
  PersonFieldInput,
  PersonFieldOutput,
  TimelineFieldInput,
  LinkFieldInput,
} from "./fields/builders.js";

export { resolveSpace, resolveBoard, resolveUser, resolveTeam, resolveItem } from "./resolvers/index.js";
export type { EntityRef } from "./resolvers/index.js";

export { workspaceMap, searchItems, bulkUpdateItems, exportItems } from "./workflows/index.js";
export type { SearchItemsParams, BulkUpdateParams, ExportItemsParams } from "./workflows/index.js";
