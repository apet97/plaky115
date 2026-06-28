# Plaky API Behavior (live-verified)

This note records wire behavior confirmed against a live Plaky workspace on
2026-06-28. It backs the SDK, CLI, and MCP types so docs and code match the real
API rather than the vendor spec alone. Values below are real shapes captured from
a sacrificial workspace; no secrets or production data are included.

## Base URL and tenant host

- The SDK and CLI default to `https://api.plaky.com`.
- Real workspaces are account-prefixed, for example `https://<account>.api.plaky.com`.
- Set the host explicitly when the generic host does not route for your account:
  - SDK: `new PlakyClient({ apiKey, serverURL: "https://<account>.api.plaky.com" })`
  - CLI: `plaky115 --server-url https://<account>.api.plaky.com ...`
  - Live sweep: `PLAKY115_BASE_URL=https://<account>.api.plaky.com`
- The toolkit does not hardcode a tenant host as the default; deriving the host
  from the account is the caller's responsibility.

## Pagination

The API is strictly page-based. Confirmed live:

- `page` and `pageSize` are honored. `pageSize=2` returns 2 items with
  `hasMore: true`, and page 1 differs from page 2.
- `limit` is not a server parameter. `limit=2` returned the full result set
  (all 28 items), so the server ignored it.
- `offset` is not a server parameter. `offset=2` returned the same first id as
  `offset=0`, so the server ignored it.

The SDK iterators expose a `limit` option, but it is a client-side cap on the
total number of items yielded. It is not sent to the server. There is no
server-side `offset`. List pages return `{ data, hasMore }`.

```ts
// Walk pages; stop after 500 items client-side.
const items = await client.items.iterate({ spaceId, boardId, pageSize: 100, limit: 500 }).toArray();
```

### Page-count safety valve

Both the SDK and the CLI cap an unbounded paging loop at the same number of
pages (`10000`) so a server that always reports `hasMore: true` cannot spin
forever. This is a safety valve, not an API contract, and it is not
configurable:

- SDK: `MAX_PAGES` in `sdk/src/runtime/pagination.ts` throws a `RangeError` when
  exceeded.
- CLI: `maxPaginationPages` in `cli/internal/cli/dx.go` aborts with an error
  when exceeded.

## Expand serialization

`expand` is declared `explode: false` in the spec. Confirmed live, the API
accepts both forms and fully expands every listed relationship:

- comma form (spec-aligned): `?expand=group,createdBy`
- repeated form: `?expand=group&expand=createdBy`

The SDK serializes `expand` as the comma form. When unexpanded, relationship
fields (for example `createdBy`, `board`, `space`, `group`) are numeric ids;
when expanded, `createdBy` becomes `{ id, email, name, type }`.

## Reactions contract

`replaceCommentReactions` is `PUT
/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions`.

Request body (each `value` is the emoji Unicode codepoint hex, not the emoji
character or a shortname):

```json
{ "reactions": [{ "value": "1f44d" }] }
```

Response is HTTP 200 with a keyed map (not an array, not 204). Keys are reaction
codes; inner objects carry `createdById` (number) and `createdAt`:

```json
{ "reactions": { "1f44d": [{ "createdById": 1001, "createdAt": "2026-06-28T12:00:00Z" }] } }
```

An empty `reactions` array removes the caller's reactions.

## Real request/response payloads

These are the captured shapes for each mutation. Field values are illustrative;
key sets and types are from live responses.

### createItem (HTTP 201)

Request:

```json
{ "title": "smoke: item", "fields": [] }
```

Response keys: `archived`, `board`, `commentCount`, `createdAt`, `createdBy`,
`deleted`, `deletedAt`, `fields`, `fileCount`, `group`, `id`, `parent`,
`ranking`, `space`, `subitems`, `subscribedTeams`, `subscribedUsers`, `title`.
`createdBy`, `board`, `space`, and `group` are numbers when unexpanded; `fields`
is an array of `{ key, type, title, value }`.

### updateItemField (HTTP 200)

`PATCH .../items/{itemId}/fields/{fieldKey}` (for example `fieldKey` = `string-2`):

```json
{ "value": "new value" }
```

Returns the full item (same keys as createItem).

### updateItemFields (HTTP 200)

`PATCH .../items/{itemId}/fields` with a map of field key (or title) to value:

```json
{ "string-2": "new value" }
```

Returns the full item.

### createItemComment (HTTP 200)

Request uses `text`; the response uses `content`:

```json
{ "text": "smoke: comment" }
```

Response keys: `content`, `createdAt`, `createdBy`, `deleted`, `id`, `pinned`,
`reactions`, `replies`, `updatedAt`. On create, `reactions` and `replies` are
empty arrays and `updatedAt` is `null`. `createdBy` is a number.

### updateItemComment (HTTP 200)

`PUT .../comments/{commentId}` with `text`; the response uses `content`.

### deleteItem / deleteItemComment (HTTP 200)

`DELETE` with an empty response body (no JSON).

## Webhooks (none exposed)

Plaky's public API exposes no webhooks endpoint: `GET /v1/public/webhooks`
returns `404` on both the generic and tenant hosts, and the generated OpenAPI
types declare no webhooks. The SDK ships no webhook-verification helper. See
`SECURITY.md`.
