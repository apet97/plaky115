# plaky115

Unofficial TypeScript SDK for the Plaky public API. The public entry point is
the hand-written `PlakyClient`.

## Installation

```bash
npm install plaky115
```

Requires Node.js `>=22.12` or another runtime with native `fetch`,
`AbortController`, Web Streams, and async iterables.

## Quick Start

```ts
import { PlakyClient } from "plaky115";

const client = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
});

const spaces = await client.spaces.list();
console.log(spaces.data);
```

## Authentication

Pass an API key string or an async provider. The provider is resolved for each
request.

```ts
const client = new PlakyClient({
  apiKey: async () => process.env.PLAKY115_API_KEY ?? "",
});
```

## Resource API

Resources are grouped under `PlakyClient`.

```ts
const space = await client.spaces.get(123);
const boards = await client.boards.list({ spaceId: 123 });
const item = await client.items.get({ spaceId: 123, boardId: 456, itemId: 789 });
```

Writes attach idempotency keys by default. You can still pass one explicitly.

```ts
await client.items.create(
  {
    spaceId: 123,
    boardId: 456,
    body: { title: "SDK smoke" },
  },
  { idempotencyKey: "import-123" },
);
```

## Pagination

List helpers return pages. Iterators walk pages for you.

```ts
for await (const item of client.items.iterate({ spaceId: 123, boardId: 456, pageSize: 100 })) {
  console.log(item.title);
}

const first = await client.spaces.iterate().firstPage();
const all = await client.spaces.iterate({ limit: 500 }).toArray();
```

## Retries

Retries are conservative. `GET` requests can retry. Write requests retry only
when an idempotency key is present. `Retry-After` is respected for rate limits
and server retry responses.

```ts
const client = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
  maxRetries: 2,
});
```

## Timeouts

The default timeout is 30 seconds. Override it globally or per request.

```ts
const client = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
  timeoutMs: 30_000,
});

await client.spaces.get(123, { timeoutMs: 5_000 });
```

## Cancellation

Pass an `AbortSignal` per request.

```ts
const controller = new AbortController();
await client.spaces.list(undefined, { signal: controller.signal });
```

## Errors

```ts
import { PlakyApiError, PlakyRateLimitError, PlakyTimeoutError } from "plaky115";

try {
  await client.spaces.get(999999);
} catch (error) {
  if (error instanceof PlakyRateLimitError) {
    console.log(error.retryAfterMs);
  }

  if (error instanceof PlakyTimeoutError) {
    console.log("timed out");
  }

  if (error instanceof PlakyApiError) {
    console.log(error.status);
    console.log(error.requestId);
    console.log(error.code);
  }
}
```

## Request IDs

`PlakyApiError` includes `requestId` when the API returns one. Use
`requestWithResponse()` when successful responses also need metadata.

```ts
const response = await client.requestWithResponse<{ ok: boolean }>({
  method: "GET",
  path: "/v1/public/spaces",
});

console.log(response.status);
console.log(response.requestId);
console.log(response.data);
```

## Custom Fetch

Inject `fetch` for tests, edge runtimes, custom agents, or instrumentation.

```ts
const client = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
  fetch: globalThis.fetch,
});
```

## Custom Headers

Headers can be static or async. Per-request headers override client headers.
An empty string deletes an inherited header.

```ts
const client = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
  headers: async () => ({ "X-App-Name": "billing-importer" }),
});

await client.spaces.get(123, { headers: { "X-Request-Name": "space-load" } });
```

## Low-Level Request Escape Hatch

Use this for an endpoint before a resource helper exists. It still uses the SDK
transport: auth, retries, timeout, cancellation, errors, and response parsing.

```ts
const data = await client.request<{ data: unknown[] }>({
  method: "GET",
  path: "/v1/public/spaces",
});

const response = await client.requestWithResponse({
  method: "GET",
  path: "/v1/public/spaces",
});
```

## TypeScript

OpenAPI schema types are generated into `sdk/src/generated/types.ts` and used as
infrastructure. The public SDK surface is exported from `plaky115`.

```ts
import type { PlakyApiResponse, SpaceShape } from "plaky115";
```

Comment responses expose both `content` (the API response field) and `text`
(kept for compatibility with existing SDK examples).

## Package Contents

The npm package publishes `README.md`, `package.json`, and `esm/`. Source files,
tests, type tests, local plans, and generated SDK operation modules are not
published.

## Versioning

This package is unofficial. Treat minor releases as the place for SDK surface
additions and patch releases as bug fixes.
