# plaky115

Unofficial TypeScript SDK for the Plaky public API. The public entry point is
the hand-crafted `PlakyClient`; generated OpenAPI operation modules are kept as
low-level escape hatches.

## Install

```bash
npm install plaky115
```

## Client

```ts
import { BoardId, ItemId, PlakyClient, SpaceId, fieldValues, statusField } from "plaky115";

const plaky = new PlakyClient({
  apiKey: process.env.PLAKY115_API_KEY!,
  maxRetries: 2,
});

const spaces = await plaky.spaces.list({ page: 1, pageSize: 50 });

const items = await plaky.items.listAll({
  spaceId: SpaceId(123),
  boardId: BoardId(456),
});
```

## Pagination

```ts
for await (const item of plaky.items.iterate({
  spaceId: SpaceId(123),
  boardId: BoardId(456),
  pageSize: 100,
  limit: 500,
})) {
  console.log(item.title);
}
```

## Mutations

```ts
await plaky.items.create({
  spaceId: SpaceId(123),
  boardId: BoardId(456),
  body: {
    title: "SDK smoke",
    fields: fieldValues({ Status: statusField("Done") }),
  },
});

const plan = await plaky.items.updateFields({
  spaceId: SpaceId(123),
  boardId: BoardId(456),
  itemId: ItemId(789),
  body: { fields: fieldValues({ Status: statusField("Review") }) },
  dryRun: true,
});
```

Mutations attach idempotency keys by default. Retries are conservative:
`GET` requests can retry, and write requests retry only when an idempotency key
is present. Validation, auth, and not-found errors are not retried.

## Raw Operations

```ts
import { listSpaces } from "plaky115/operations/list-spaces.js";

const page = await listSpaces(
  { query: { page: 1, pageSize: 50 } },
  plaky.requestOptions(),
);
```

Prefer `PlakyClient` for application code. Use raw operation modules when you
need a direct one-to-one call to the OpenAPI operation.
