export { PlakyClient, DEFAULT_SERVER_URL } from "./client/client.js";
export type { PlakyClientOptions } from "./client/client.js";

export { SpacesResource } from "./client/spaces.js";
export type { SpaceExpand, SpaceGetParams, SpaceIteratorParams, SpaceListParams } from "./client/spaces.js";
export { BoardsResource } from "./client/boards.js";
export { ItemsResource } from "./client/items.js";
export type {
  ItemExpand,
  ItemGetParams,
  ItemIteratorParams,
  ItemListParams,
  ItemListSubitemsParams,
  ItemCreateParams,
  ItemCreateBody,
  ItemFieldValueBody,
  ItemUpdateFieldParams,
  ItemUpdateFieldsParams,
  ItemDeleteParams,
  SubitemsBehaviour,
} from "./client/items.js";
export { ItemCommentsResource } from "./client/item-comments.js";
export type { CommentScopeParams, CommentWriteBody } from "./client/item-comments.js";
export { ReactionsResource } from "./client/reactions.js";
export type { ReplaceReactionsParams, ReactionReplaceBody, ReactionReplaceResult } from "./client/reactions.js";
export { UsersResource } from "./client/users.js";
export type { UserIteratorParams, UserListParams, UserStatus, UserType } from "./client/users.js";
export { TeamsResource } from "./client/teams.js";
export { ItemGroupsResource } from "./client/item-groups.js";
export type {
  ItemGroupCreateBody,
  ItemGroupUpdateBody,
  ItemGroupListParams,
  ItemGroupIteratorParams,
  ItemGroupGetParams,
  ItemGroupCreateParams,
  ItemGroupUpdateParams,
  ItemGroupDeleteParams,
} from "./client/item-groups.js";
export { ItemFilesResource } from "./client/item-files.js";
export type {
  ItemFileUpdateBody,
  ItemFileListParams,
  ItemFileGetParams,
  ItemFileUploadParams,
  ItemFileUpdateParams,
  ItemFileDeleteParams,
} from "./client/item-files.js";

export {
  PlakyError,
  PlakyConnectionError,
  PlakyTimeoutError,
  PlakyAbortError,
  PlakyDecodeError,
  PlakyResponseContractError,
  PlakyResponseTooLargeError,
  PlakyApiError,
  PlakyAuthError,
  PlakyPermissionError,
  PlakyNotFoundError,
  PlakyConflictError,
  PlakyValidationError,
  PlakyUnprocessableEntityError,
  PlakyRateLimitError,
  PlakyServerError,
  PlakyAmbiguousMatchError,
} from "./runtime/errors.js";
export type { NormalizedProblem, NormalizedProblemFamily, PlakyProblem } from "./runtime/errors.js";
export { PlakyPartialMutationError } from "./runtime/mutations.js";
export type {
  MutationErrorSummary,
  MutationPhase,
  MutationReceipt,
  MutationReceiptStatus,
} from "./runtime/mutations.js";
export type {
  ApiKeyProvider,
  FetchLike,
  HeaderProvider,
  PlakyApiResponse,
  PlakyRequestOverrides,
  ResourceRequestOverrides,
  QueryParams,
  ResponseType,
} from "./runtime/types.js";

export { newIdempotencyKey } from "./runtime/idempotency.js";
export { redact, redactRecord } from "./runtime/redact.js";
export { withRetries } from "./runtime/retries.js";
export type { RetryOptions } from "./runtime/retries.js";
export type { Interceptors, RequestInterceptorContext, ResponseInterceptorContext } from "./runtime/interceptors.js";
export { RateLimitSink } from "./runtime/rate-limit.js";
export type { RateLimitSnapshot } from "./runtime/rate-limit.js";
export { paginate } from "./runtime/pagination.js";
export type { Page, PageFetcher, PageOptions, PaginatedIterator } from "./runtime/pagination.js";
export type { PlakyRequestOptions } from "./runtime/http.js";

export type {
  paths as PlakyOpenApiPaths,
  components as PlakyOpenApiComponents,
  operations as PlakyOpenApiOperations,
} from "./generated/types.js";

export {
  SpaceId,
  BoardId,
  ItemId,
  CommentId,
  FieldKey,
  UserId,
  TeamId,
  ItemGroupId,
  ItemFileId,
  FolderId,
  asSpaceId,
  asBoardId,
  asItemId,
  asCommentId,
  asFieldKey,
  asUserId,
  asTeamId,
  asItemGroupId,
  asItemFileId,
  asFolderId,
} from "./runtime/ids.js";
export type {
  SpaceId as SpaceIdType,
  BoardId as BoardIdType,
  ItemId as ItemIdType,
  CommentId as CommentIdType,
  FieldKey as FieldKeyType,
  UserId as UserIdType,
  TeamId as TeamIdType,
  ItemGroupId as ItemGroupIdType,
  ItemFileId as ItemFileIdType,
  FolderId as FolderIdType,
  Branded,
} from "./runtime/ids.js";

export type {
  PagedResult,
  StrictPagedResult,
  FieldShape,
  ItemFieldShape,
  ItemGroupShape,
  FolderShape,
  TeamShortShape,
  ItemFileShape,
  ItemFileDownloadShape,
  BoardKind,
  BoardShape,
  SpaceKind,
  SpaceShape,
  ShortUserShape,
  UserShape,
  TeamShape,
  ReactionShape,
  ReactionDetailShape,
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

export {
  resolveSpace,
  resolveBoard,
  resolveSpaceAndBoard,
  resolveUser,
  resolveTeam,
  resolveItem,
  resolveItemsInBoard,
  resolveItemGroupInBoard,
  resolveItemFileOnItem,
} from "./resolvers/index.js";
export type { EntityRef } from "./resolvers/index.js";

export { workspaceMap, searchItems, searchItemsDetailed, bulkUpdateItems, exportItems } from "./workflows/index.js";
export type { SearchItemsParams, SearchItemsDetailedResult, BulkUpdateParams, ExportItemsParams } from "./workflows/index.js";
