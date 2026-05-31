import { expectAssignable, expectType } from "tsd";
import {
  PlakyClient,
  PlakyApiError,
  PlakyRateLimitError,
  type FetchLike,
  type CommentShape,
  type ItemExpand,
  type PlakyOpenApiComponents,
  type PlakyOpenApiOperations,
  type PlakyApiResponse,
  type PlakyClientOptions,
  type PlakyRequestOverrides,
  type SpaceExpand,
  type SubitemsBehaviour,
  type UserStatus,
  type UserType,
} from "plaky115";
import type { SpaceShape } from "plaky115";

const fetchLike: FetchLike = async (input, init) => fetch(input, init);

const client = new PlakyClient({
  apiKey: async () => "plk_test",
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
const goalItemExpand: ItemExpand = "subscribedUsers";
const subitemsBehaviour: SubitemsBehaviour = "INCLUDE";
expectAssignable<ItemExpand>(itemExpand);
expectAssignable<ItemExpand>(goalItemExpand);
expectAssignable<SubitemsBehaviour>(subitemsBehaviour);

type SpaceResponseSchema = PlakyOpenApiComponents["schemas"]["SpaceResponse"];
expectAssignable<SpaceResponseSchema>({});
type ListSpacesOperation = PlakyOpenApiOperations["listSpaces"];
expectAssignable<ListSpacesOperation["parameters"]["query"]>({ expand: ["board"] });
