import { expectAssignable, expectType } from "tsd";
import {
  PlakyClient,
  PlakyApiError,
  PlakyRateLimitError,
  type FetchLike,
  type PlakyApiResponse,
  type PlakyClientOptions,
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
