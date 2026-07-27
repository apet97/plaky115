# plaky115

[![npm](https://img.shields.io/npm/v/plaky115)](https://www.npmjs.com/package/plaky115)
[![Node.js >=22.12](https://img.shields.io/badge/node-%3E%3D22.12-339933?logo=node.js&logoColor=white)](package.json)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Unofficial TypeScript SDK for the Plaky public API. The public entry point is
the hand-written `PlakyClient`. Not affiliated with, endorsed by, or sponsored
by Plaky or CAKE.com.

Repository documentation: [overview](https://github.com/apet97/plaky115#readme) ·
[verified API behavior](https://github.com/apet97/plaky115/blob/main/docs/api-behavior.md) ·
[security](https://github.com/apet97/plaky115/blob/main/SECURITY.md)

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

## Base URL

Real Plaky workspaces are account-prefixed (for example
`https://<account>.api.plaky.com`). The client defaults to
`https://api.plaky.com`; set the host explicitly when the generic host does not
route for your workspace:

```ts
const client = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
  serverURL: "https://<account>.api.plaky.com",
});
```

The API is page-based: `page` and `pageSize` are server parameters, while the
iterator `limit` is a client-side cap. Verified wire behavior is documented at
<https://github.com/apet97/plaky115/blob/main/docs/api-behavior.md>.

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
const expandedSpace = await client.spaces.get({ spaceId: 123, expand: ["board"] });
const boards = await client.boards.list({ spaceId: 123 });
const item = await client.items.get({ spaceId: 123, boardId: 456, itemId: 789 });
const users = await client.users.list({ emails: ["teammate@example.com"], status: "ACTIVE", type: "MEMBER" });
```

Item Groups are paged and expose typed helpers for all six public operations:

- `client.itemGroups.list`, `client.itemGroups.iterate`, and
  `client.itemGroups.listAll`
- `client.itemGroups.get`, `client.itemGroups.create`, and
  `client.itemGroups.update`
- `client.itemGroups.archive` and `client.itemGroups.delete` (bodyless void
  operations)

```ts
const createdGroup = await client.itemGroups.create({
  spaceId: 123,
  boardId: 456,
  body: { title: "In review", color: "#7B61FF" },
});

if (createdGroup.id !== undefined) {
  await client.itemGroups.archive({ spaceId: 123, boardId: 456, itemGroupId: createdGroup.id });
}
```

Item files use `Blob`/`FormData`; the SDK does not accept filesystem paths:

- `client.itemFiles.list` returns the API's bare array.
- `client.itemFiles.upload`, `client.itemFiles.get`, `client.itemFiles.update`,
  and `client.itemFiles.delete` cover attachment metadata and lifecycle
  operations.
- `client.itemFiles.getDownload` returns short-lived metadata once; it never
  follows the signed URL.

```ts
const uploadedFile = await client.itemFiles.upload({
  spaceId: 123,
  boardId: 456,
  itemId: 789,
  file: new Blob(["report contents"], { type: "text/plain" }),
  fileName: "report.txt",
});

if (uploadedFile.id !== undefined) {
  const download = await client.itemFiles.getDownload({
    spaceId: 123,
    boardId: 456,
    itemId: 789,
    itemFileId: uploadedFile.id,
  });
  // `download.url` is returned once. The SDK does not follow or log it.
}
```

Generated OpenAPI schema types are exported as type-only escape hatches:

```ts
import type { PlakyOpenApiComponents } from "plaky115";

type SpaceResponse = PlakyOpenApiComponents["schemas"]["SpaceResponse"];
```

Writes never generate idempotency keys or retry automatically. Pass a stable key
explicitly when your application needs a request identifier. The public Plaky
contract does not document write deduplication, so a key is not permission to
replay a mutation automatically.

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

## Search and export workflows

`searchItemsDetailed(client, ...)` scans at most 200 items by default and
returns `{ data, scanned, matched, truncated, nextPage? }`. `truncated: true`
means the client hit the scan limit while the server still reported another
page; the deprecated `searchItems()` compatibility wrapper returns only the
matched array.

`exportItems(client, { format: "csv" })` emits deterministic spreadsheet-safe
CSV by default. Set `csvSafety: "raw"` only for a trusted downstream consumer
that explicitly needs leading formula characters unchanged.

## Retries

Retries are conservative. Only `GET` requests can retry; writes remain
single-attempt even when an idempotency key is present. `Retry-After` is
respected for rate limits and retryable server responses.

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

## License

MIT — see the bundled `LICENSE` file.

## See Also

- [Repository README](https://github.com/apet97/plaky115#readme)
- [SECURITY.md](https://github.com/apet97/plaky115/blob/main/SECURITY.md) — API-key handling, transport, and the destructive-operation model
- [docs/api-behavior.md](https://github.com/apet97/plaky115/blob/main/docs/api-behavior.md) — verified wire behavior
- [examples/](https://github.com/apet97/plaky115/tree/main/examples) — runnable SDK, CLI, and MCP examples
