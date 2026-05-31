import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemId, FieldKey } from "../runtime/ids.js";
import type { PagedResult, ItemShape } from "./shapes.js";

export type ItemExpand =
  | "space"
  | "board"
  | "group"
  | "createdBy"
  | "parent"
  | "subscriptions"
  | "fields"
  | "subitems"
  | "subscribedUsers"
  | "subscribedTeams";
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
  body: Record<string, unknown>;
  idempotencyKey?: string;
  dryRun?: boolean;
};

export type ItemUpdateFieldParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
  itemId: ItemId | string | number;
  itemFieldKey: FieldKey | string;
  body: Record<string, unknown>;
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

export class ItemsResource {
  constructor(private readonly client: PlakyClient) {}

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

  async create(params: ItemCreateParams, options?: PlakyRequestOverrides): Promise<ItemShape | DryRunPlan> {
    if (params.dryRun === true) {
      return planMutation("createItem", { spaceId: params.spaceId, boardId: params.boardId, body: params.body });
    }
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("item");
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

  async delete(params: ItemDeleteParams, options?: PlakyRequestOverrides): Promise<void> {
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("item-del");
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

  async updateField(params: ItemUpdateFieldParams, options?: PlakyRequestOverrides): Promise<ItemShape> {
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("item-field");
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

  async updateFields(params: ItemUpdateFieldsParams, options?: PlakyRequestOverrides): Promise<ItemShape | DryRunPlan> {
    if (params.dryRun === true) {
      return planMutation("updateItemFields", { spaceId: params.spaceId, boardId: params.boardId, itemId: params.itemId, body: params.body });
    }
    const idempotencyKey = params.idempotencyKey ?? options?.idempotencyKey ?? newIdempotencyKey("item-fields");
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

  async listAll(params: ItemIteratorParams): Promise<ItemShape[]> {
    const out: ItemShape[] = [];
    for await (const i of this.iterate(params)) out.push(i);
    return out;
  }
}

function planMutation(op: string, payload: Record<string, unknown>): DryRunPlan {
  return { dryRun: true, operation: op, payload };
}
