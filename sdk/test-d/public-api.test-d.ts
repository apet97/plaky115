import { expectAssignable, expectType } from "tsd";
import {
  PlakyClient,
  PlakyApiError,
  PlakyRateLimitError,
  type FetchLike,
  type CommentShape,
  type PlakyApiResponse,
  type PlakyClientOptions,
  type PlakyRequestOverrides,
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
