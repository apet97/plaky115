import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { resolveIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, FieldKey } from "../runtime/ids.js";
import type { PagedResult, ItemShape } from "./shapes.js";
import type { components } from "../generated/types.js";

/** Request body for creating an item, derived from the generated `ItemCreateRequest`. */
export type ItemCreateBody = components["schemas"]["ItemCreateRequest"];

/** Request body for updating a single field, derived from the generated `FieldValueChangeRequest`. */
export type ItemFieldValueBody = components["schemas"]["FieldValueChangeRequest"];

// The Plaky API accepts exactly these seven expand values for item operations.
// `subitems`/`subscribedUsers`/`subscribedTeams` are item *response* fields, not
// expand flags — passing them returns HTTP 400 UNKNOWN_EXPAND_FIELD (live-confirmed).
// `subscriptions` expands both subscribedUsers and subscribedTeams; subitem
// objects are reachable via `items.listSubitems`. Mirrors the generated enum.
export type ItemExpand =
  | "space"
  | "board"
  | "group"
  | "createdBy"
  | "parent"
  | "subscriptions"
  | "fields";
export type SubitemsBehaviour = "INCLUDE" | "EXCLUDE" | "EMBED";

export type ItemListParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  boardViewId?: number | undefined;
  parentId?: ItemId | string | number | undefined;
  subitemsBehaviour?: SubitemsBehaviour | undefined;
  expand?: readonly ItemExpand[] | undefined;
  page?: number;
  pageSize?: number;
};

export type ItemGetParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  expand?: readonly ItemExpand[] | undefined;
};

export type ItemListSubitemsParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  expand?: readonly ItemExpand[] | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type ItemIteratorParams = Omit<ItemListParams, "page"> & {
  limit?: number | undefined;
};

export type ItemCreateParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  body: ItemCreateBody;
  idempotencyKey?: string;
  dryRun?: boolean;
};

export type ItemUpdateFieldParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  itemFieldKey: FieldKey | string;
  body: ItemFieldValueBody;
  idempotencyKey?: string;
};

export type ItemUpdateFieldsParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  body: Record<string, unknown>;
  idempotencyKey?: string;
  dryRun?: boolean;
};

export type ItemDeleteParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  idempotencyKey?: string;
};

export type DryRunPlan = {
  dryRun: true;
  operation: string;
  payload: Record<string, unknown>;
};

/** Items resource. Access via `client.items`. */
export class ItemsResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * List a page of items on a board.
   *
   * @param params - `spaceId`/`boardId` plus optional `expand`, `parentId`,
   *   `subitemsBehaviour`, `boardViewId`, `page`, and `pageSize`.
   * @param options - Per-request overrides.
   * @returns A page of items with `data` and `hasMore`.
   * @throws {import("../runtime/errors.js").PlakyApiError} On API errors.
   */
  list(params: ItemListParams, options?: PlakyRequestOverrides): Promise<PagedResult<ItemShape>> {
    const { spaceId, boardId, ...query } = params;
    return this.client.request<PagedResult<ItemShape>>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}/boards/${pathSegment(boardId)}/items`,
        query,
        operationId: "listItems",
      },
      options,
    );
  }

  /**
   * Fetch one item by id, optionally expanding relationships. Without `expand`,
   * relationship fields such as `createdBy` are numeric ids; with `expand` they
   * become full objects. See `docs/api-behavior.md`.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, and optional `expand`.
   * @param options - Per-request overrides.
   * @returns The item.
   * @throws {import("../runtime/errors.js").PlakyNotFoundError} If the item does not exist.
   */
  get(params: ItemGetParams, options?: PlakyRequestOverrides): Promise<ItemShape> {
    const { spaceId, boardId, itemId, ...query } = params;
    return this.client.request<ItemShape>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}/boards/${pathSegment(boardId)}/items/${pathSegment(itemId)}`,
        query,
        operationId: "getItem",
      },
      options,
    );
  }

  /**
   * List a page of subitems for an item.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, optional `expand`/`page`/`pageSize`.
   * @param options - Per-request overrides.
   * @returns A page of subitems with `data` and `hasMore`.
   */
  listSubitems(
    params: ItemListSubitemsParams,
    options?: PlakyRequestOverrides,
  ): Promise<PagedResult<ItemShape>> {
    const { spaceId, boardId, itemId, ...query } = params;
    return this.client.request<PagedResult<ItemShape>>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}/boards/${pathSegment(boardId)}/items/${pathSegment(itemId)}/sub-items`,
        query,
        operationId: "listSubitems",
      },
      options,
    );
  }

  /**
   * Create an item on a board. Attaches a generated idempotency key by default,
   * so retried writes do not duplicate. Returns the created item (HTTP 201).
   *
   * @param params - `spaceId`, `boardId`, `body` ({@link ItemCreateBody}),
   *   optional `idempotencyKey`, and `dryRun`.
   * @param options - Per-request overrides.
   * @returns The created {@link ItemShape}, or a {@link DryRunPlan} when `dryRun` is true.
   * @throws {import("../runtime/errors.js").PlakyValidationError} On invalid body.
   * @example
   * ```ts
   * await client.items.create({
   *   spaceId: 123,
   *   boardId: 456,
   *   body: { title: "Ship API wrapper", fields: fieldValues({ Status: statusField("Done") }) },
   * });
   * ```
   */
  async create(params: ItemCreateParams, options?: PlakyRequestOverrides): Promise<ItemShape | DryRunPlan> {
    if (params.dryRun === true) {
      return planMutation("createItem", { spaceId: params.spaceId, boardId: params.boardId, body: params.body });
    }
    const idempotencyKey = resolveIdempotencyKey(params, options, "item");
    return this.client.request<ItemShape>(
      {
        method: "POST",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items`,
        body: params.body,
        operationId: "createItem",
      },
      { ...options, idempotencyKey },
    );
  }

  /**
   * Delete an item. Destructive. Attaches a generated idempotency key by default.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, optional `idempotencyKey`.
   * @param options - Per-request overrides.
   * @returns Nothing; resolves once the API confirms deletion.
   * @throws {import("../runtime/errors.js").PlakyNotFoundError} If the item does not exist.
   */
  async delete(params: ItemDeleteParams, options?: PlakyRequestOverrides): Promise<void> {
    const idempotencyKey = resolveIdempotencyKey(params, options, "item-del");
    await this.client.request<void>(
      {
        method: "DELETE",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}`,
        operationId: "deleteItem",
        responseType: "void",
      },
      { ...options, idempotencyKey },
    );
  }

  /**
   * Update a single field on an item by field key (for example `string-2`).
   * Sends a `FieldValueChangeRequest` (`{ value }`) and returns the full item.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `itemFieldKey`, and `body`
   *   ({@link ItemFieldValueBody}: `{ value }`, where `value` stays field-type-specific).
   * @param options - Per-request overrides.
   * @returns The updated {@link ItemShape}.
   */
  async updateField(params: ItemUpdateFieldParams, options?: PlakyRequestOverrides): Promise<ItemShape> {
    const idempotencyKey = resolveIdempotencyKey(params, options, "item-field");
    return this.client.request<ItemShape>(
      {
        method: "PATCH",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}/fields/${pathSegment(params.itemFieldKey)}`,
        body: params.body,
        operationId: "updateItemField",
      },
      { ...options, idempotencyKey },
    );
  }

  /**
   * Update multiple fields on an item in one call. The body is a map of field
   * key (or title) to value; the value envelope is field-type-specific, so it is
   * intentionally typed open as `Record<string, unknown>`.
   *
   * @param params - `spaceId`, `boardId`, `itemId`, `body`, optional
   *   `idempotencyKey` and `dryRun`.
   * @param options - Per-request overrides.
   * @returns The updated {@link ItemShape}, or a {@link DryRunPlan} when `dryRun` is true.
   */
  async updateFields(params: ItemUpdateFieldsParams, options?: PlakyRequestOverrides): Promise<ItemShape | DryRunPlan> {
    if (params.dryRun === true) {
      return planMutation("updateItemFields", { spaceId: params.spaceId, boardId: params.boardId, itemId: params.itemId, body: params.body });
    }
    const idempotencyKey = resolveIdempotencyKey(params, options, "item-fields");
    return this.client.request<ItemShape>(
      {
        method: "PATCH",
        path: `/v1/public/spaces/${pathSegment(params.spaceId)}/boards/${pathSegment(params.boardId)}/items/${pathSegment(params.itemId)}/fields`,
        body: params.body,
        operationId: "updateItemFields",
      },
      { ...options, idempotencyKey },
    );
  }

  /**
   * Lazily iterate items across pages. `limit` is a client-side cap on items
   * yielded (the API has no server-side `limit`/`offset`). See `docs/api-behavior.md`.
   *
   * @param params - List filters plus `pageSize` and optional client-side `limit`.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(params: ItemIteratorParams): PaginatedIterator<ItemShape> {
    const { limit, pageSize, ...query } = params;
    return paginate<ItemShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...query, page, pageSize });
        return { data: (res.data ?? []) as ItemShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize, limit },
    );
  }

  /**
   * Collect all matching items into an array, walking every page.
   *
   * @param params - List filters plus `pageSize` and optional client-side `limit`.
   * @returns Every matching item.
   */
  async listAll(params: ItemIteratorParams): Promise<ItemShape[]> {
    const out: ItemShape[] = [];
    for await (const i of this.iterate(params)) out.push(i);
    return out;
  }
}

function planMutation(op: string, payload: Record<string, unknown>): DryRunPlan {
  return { dryRun: true, operation: op, payload };
}
