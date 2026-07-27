import { expectAssignable, expectType } from "tsd";
import {
  FolderId,
  ItemFileId,
  ItemGroupId,
  PlakyClient,
  PlakyApiError,
  PlakyRateLimitError,
  type BoardShape,
  type FetchLike,
  type CommentShape,
  type FolderIdType,
  type FolderShape,
  type ItemExpand,
  type ItemFileDownloadShape,
  type ItemFileDeleteParams,
  type ItemFileGetParams,
  type ItemFileIdType,
  type ItemFileListParams,
  type ItemFileShape,
  type ItemFileUpdateBody,
  type ItemFileUpdateParams,
  type ItemFileUploadParams,
  type ItemGroupIdType,
  type ItemGroupCreateBody,
  type ItemGroupCreateParams,
  type ItemGroupGetParams,
  type ItemGroupIteratorParams,
  type ItemGroupListParams,
  type ItemGroupShape,
  type ItemGroupUpdateBody,
  type ItemGroupUpdateParams,
  type ItemGroupDeleteParams,
  type ItemShape,
  type PlakyOpenApiComponents,
  type PlakyOpenApiOperations,
  type PlakyApiResponse,
  type PlakyClientOptions,
  type PlakyRequestOverrides,
  type SpaceExpand,
  type SpaceIdType,
  type SpaceShape,
  type SubitemsBehaviour,
  type TeamShape,
  type TeamShortShape,
  type UserStatus,
  type UserType,
} from "plaky115";

const fetchLike: FetchLike = async (input, init) => fetch(input, init);

const client = new PlakyClient({
  apiKey: async () => "test-api-key",
  fetch: fetchLike,
  headers: async () => ({ "X-Test": "1" }),
} satisfies PlakyClientOptions);

const space = await client.spaces.get(1);
expectType<SpaceShape>(space);
expectType<Promise<SpaceShape>>(client.spaces.get(1, { timeoutMs: 5000 }));
expectType<Promise<SpaceShape>>(client.spaces.get({ spaceId: 1, expand: ["board"] }));
await client.spaces.get(1);
await client.spaces.list({ expand: ["board"], pageSize: 100 });

const spaceExpand: SpaceExpand = "board";
expectType<SpaceExpand>(spaceExpand);

const requestOverrides = {
  headers: { "X-Test": "2" },
  maxRetries: 1,
  responseType: "json",
} satisfies PlakyRequestOverrides;
expectAssignable<PlakyRequestOverrides>(requestOverrides);

const response = await client.requestWithResponse<{ ok: boolean }>({
  method: "GET",
  path: "/v1/public/spaces",
});
expectType<PlakyApiResponse<{ ok: boolean }>>(response);
expectType<number>(response.status);
expectAssignable<Headers>(response.headers);

try {
  await client.spaces.get(1);
} catch (error) {
  if (error instanceof PlakyRateLimitError) expectType<number | undefined>(error.retryAfterMs);
  if (error instanceof PlakyApiError) expectType<string | undefined>(error.requestId);
}

const comment = await client.comments.create({
  spaceId: 1,
  boardId: 2,
  itemId: 3,
  body: { text: "hello" },
});
expectType<CommentShape>(comment);
expectType<string | undefined>(comment.content);
expectType<string | undefined>(comment.text);

await client.users.list({ emails: ["a@example.com"], status: "ACTIVE", type: "MEMBER" });
const status: UserStatus = "ACTIVE";
const userType: UserType = "MEMBER";
expectAssignable<UserStatus>(status);
expectAssignable<UserType>(userType);

await client.items.get({ spaceId: 1, boardId: 2, itemId: 3 });
await client.items.get({ spaceId: 1, boardId: 2, itemId: 3, expand: ["fields"] });
await client.items.list({ spaceId: 1, boardId: 2, subitemsBehaviour: "INCLUDE", expand: ["fields"] });
await client.items.listSubitems({ spaceId: 1, boardId: 2, itemId: 3, expand: ["fields"] });
const itemExpand: ItemExpand = "fields";
const goalItemExpand: ItemExpand = "subscriptions";
const subitemsBehaviour: SubitemsBehaviour = "INCLUDE";
expectAssignable<ItemExpand>(itemExpand);
expectAssignable<ItemExpand>(goalItemExpand);
expectAssignable<SubitemsBehaviour>(subitemsBehaviour);

// Drift guard: ItemExpand must stay equal to the generated listItems expand enum
// (the API rejects any other value with HTTP 400 UNKNOWN_EXPAND_FIELD).
type GeneratedItemExpand = NonNullable<NonNullable<PlakyOpenApiOperations["listItems"]["parameters"]["query"]>["expand"]>[number];
expectAssignable<GeneratedItemExpand>(itemExpand);
expectAssignable<ItemExpand>("subscriptions" as GeneratedItemExpand);

type SpaceResponseSchema = PlakyOpenApiComponents["schemas"]["SpaceResponse"];
expectAssignable<SpaceResponseSchema>({});
type ListSpacesOperation = PlakyOpenApiOperations["listSpaces"];
expectAssignable<ListSpacesOperation["parameters"]["query"]>({ expand: ["board"] });

const itemGroupId = ItemGroupId(11);
const itemFileId = ItemFileId("12");
const folderId = FolderId(13);
expectType<ItemGroupIdType>(itemGroupId);
expectType<ItemFileIdType>(itemFileId);
expectType<FolderIdType>(folderId);

const folder = {} as FolderShape;
expectType<FolderIdType | undefined>(folder.id);
expectType<string | undefined>(folder.ranking);
expectType<string | undefined>(folder.title);

const teamShort = {} as TeamShortShape;
expectType<boolean | undefined>(teamShort.allUsersTeam);
expectType<string | undefined>(teamShort.title);

const itemGroup = {} as ItemGroupShape;
expectType<ItemGroupIdType | undefined>(itemGroup.id);
expectType<string | undefined>(itemGroup.color);
expectType<string | undefined>(itemGroup.ranking);
expectType<string | undefined>(itemGroup.title);

const itemFile = {} as ItemFileShape;
expectType<ItemFileIdType | undefined>(itemFile.id);
expectType<string | undefined>(itemFile.createdAt);
expectType<string | undefined>(itemFile.description);
expectType<string | undefined>(itemFile.extension);
expectType<string | undefined>(itemFile.fileType);
expectType<string | undefined>(itemFile.name);
expectType<number | undefined>(itemFile.size);
expectType<number | undefined>(itemFile.uploadedBy);

const itemFileDownload = {} as ItemFileDownloadShape;
expectType<string | undefined>(itemFileDownload.url);
expectType<number | undefined>(itemFileDownload.expiresInSeconds);

const boardShape = {} as BoardShape;
expectType<FolderShape | number | null | undefined>(boardShape.folder);
expectType<SpaceIdType | SpaceShape | undefined>(boardShape.space);

const teamShape = {} as TeamShape;
expectType<number[] | undefined>(teamShape.members);

const itemShape = {} as ItemShape;
expectType<(TeamShortShape | number)[] | null | undefined>(itemShape.subscribedTeams);

const groupListParams = { spaceId: 1, boardId: 2, pageSize: 50 } satisfies ItemGroupListParams;
const groupIteratorParams = { ...groupListParams, limit: 10 } satisfies ItemGroupIteratorParams;
const groupGetParams = { spaceId: 1, boardId: 2, itemGroupId } satisfies ItemGroupGetParams;
const groupCreateBody = { title: "Backlog", color: "#123456" } satisfies ItemGroupCreateBody;
const groupUpdateBody = { title: "Doing", ranking: "m" } satisfies ItemGroupUpdateBody;
const groupCreateParams = { spaceId: 1, boardId: 2, body: groupCreateBody } satisfies ItemGroupCreateParams;
const groupUpdateParams = { ...groupGetParams, body: groupUpdateBody } satisfies ItemGroupUpdateParams;
const groupDeleteParams = { ...groupGetParams, idempotencyKey: "key" } satisfies ItemGroupDeleteParams;
expectType<Promise<ItemGroupShape>>(client.itemGroups.get(groupGetParams));
expectType<Promise<ItemGroupShape>>(client.itemGroups.create(groupCreateParams));
expectType<Promise<ItemGroupShape>>(client.itemGroups.update(groupUpdateParams));
expectType<Promise<void>>(client.itemGroups.delete(groupDeleteParams));
expectType<Promise<void>>(client.itemGroups.archive(groupDeleteParams));
expectType<Promise<ItemGroupShape[]>>(client.itemGroups.listAll(groupIteratorParams));

const fileListParams = { spaceId: 1, boardId: 2, itemId: 3 } satisfies ItemFileListParams;
const fileGetParams = { ...fileListParams, itemFileId } satisfies ItemFileGetParams;
const fileUploadParams = { ...fileListParams, file: new Blob(["x"]), fileName: "x.txt" } satisfies ItemFileUploadParams;
const fileUpdateBody = { name: "renamed.txt", description: "Current" } satisfies ItemFileUpdateBody;
const fileUpdateParams = { ...fileGetParams, body: fileUpdateBody } satisfies ItemFileUpdateParams;
const fileDeleteParams = { ...fileGetParams, idempotencyKey: "key" } satisfies ItemFileDeleteParams;
expectType<Promise<ItemFileShape[]>>(client.itemFiles.list(fileListParams));
expectType<Promise<ItemFileShape>>(client.itemFiles.upload(fileUploadParams));
expectType<Promise<ItemFileShape>>(client.itemFiles.get(fileGetParams));
expectType<Promise<ItemFileDownloadShape>>(client.itemFiles.getDownload(fileGetParams));
expectType<Promise<ItemFileShape>>(client.itemFiles.update(fileUpdateParams));
expectType<Promise<void>>(client.itemFiles.delete(fileDeleteParams));

const returnedGroup = await client.itemGroups.get(groupGetParams);
if (returnedGroup.id !== undefined) {
  expectType<Promise<ItemGroupShape>>(client.itemGroups.get({ ...groupListParams, itemGroupId: returnedGroup.id }));
}
const returnedFile = await client.itemFiles.get(fileGetParams);
if (returnedFile.id !== undefined) {
  expectType<Promise<ItemFileShape>>(client.itemFiles.get({ ...fileListParams, itemFileId: returnedFile.id }));
}
