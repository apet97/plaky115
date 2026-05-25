import type { PlakyClient } from "./client.js";
import { listItems } from "../generated/operations/list-items.js";
import { listSubitems } from "../generated/operations/list-subitems.js";
import { getItem } from "../generated/operations/get-item.js";
import { createItem } from "../generated/operations/create-item.js";
import { deleteItem } from "../generated/operations/delete-item.js";
import { updateItemField } from "../generated/operations/update-item-field.js";
import { updateItemFields } from "../generated/operations/update-item-fields.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { newIdempotencyKey } from "../runtime/idempotency.js";
import type { SpaceId, BoardId, ItemId, FieldKey } from "../runtime/ids.js";
import type { PagedResult, ItemShape } from "./shapes.js";

export type ItemListParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  page?: number;
  pageSize?: number;
};

export type ItemCreateParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  body: Record<string, unknown>;
  idempotencyKey?: string;
  dryRun?: boolean;
};

export type ItemUpdateFieldParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  itemId: ItemId;
  itemFieldKey: FieldKey;
  body: Record<string, unknown>;
  idempotencyKey?: string;
};

export type ItemUpdateFieldsParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  itemId: ItemId;
  body: Record<string, unknown>;
  idempotencyKey?: string;
  dryRun?: boolean;
};

export type ItemDeleteParams = {
  spaceId: SpaceId;
  boardId: BoardId;
  itemId: ItemId;
  idempotencyKey?: string;
};

export type DryRunPlan = {
  dryRun: true;
  operation: string;
  payload: Record<string, unknown>;
};

export class ItemsResource {
  constructor(private readonly client: PlakyClient) {}

  list(params: ItemListParams): Promise<PagedResult<ItemShape>> {
    const { spaceId, boardId, ...query } = params;
    return listItems({ spaceId, boardId, query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<ItemShape>>;
  }

  get(params: { spaceId: SpaceId; boardId: BoardId; itemId: ItemId }): Promise<ItemShape> {
    return getItem(params, this.client.requestOptions()) as unknown as Promise<ItemShape>;
  }

  listSubitems(params: { spaceId: SpaceId; boardId: BoardId; itemId: ItemId; page?: number; pageSize?: number }): Promise<PagedResult<ItemShape>> {
    const { spaceId, boardId, itemId, ...query } = params;
    return listSubitems({ spaceId, boardId, itemId, query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<ItemShape>>;
  }

  async create(params: ItemCreateParams): Promise<ItemShape | DryRunPlan> {
    if (params.dryRun === true) {
      return planMutation("createItem", { spaceId: params.spaceId, boardId: params.boardId, body: params.body });
    }
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("item");
    return createItem(
      { spaceId: params.spaceId, boardId: params.boardId, body: params.body as never },
      this.client.requestOptions({ idempotencyKey }),
    ) as unknown as Promise<ItemShape>;
  }

  async delete(params: ItemDeleteParams): Promise<void> {
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("item-del");
    await deleteItem(
      { spaceId: params.spaceId, boardId: params.boardId, itemId: params.itemId },
      this.client.requestOptions({ idempotencyKey }),
    );
  }

  async updateField(params: ItemUpdateFieldParams): Promise<ItemShape> {
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("item-field");
    return updateItemField(
      {
        spaceId: params.spaceId,
        boardId: params.boardId,
        itemId: params.itemId,
        itemFieldKey: params.itemFieldKey,
        body: params.body as never,
      },
      this.client.requestOptions({ idempotencyKey }),
    ) as unknown as Promise<ItemShape>;
  }

  async updateFields(params: ItemUpdateFieldsParams): Promise<ItemShape | DryRunPlan> {
    if (params.dryRun === true) {
      return planMutation("updateItemFields", { spaceId: params.spaceId, boardId: params.boardId, itemId: params.itemId, body: params.body });
    }
    const idempotencyKey = params.idempotencyKey ?? newIdempotencyKey("item-fields");
    return updateItemFields(
      {
        spaceId: params.spaceId,
        boardId: params.boardId,
        itemId: params.itemId,
        body: params.body as never,
      },
      this.client.requestOptions({ idempotencyKey }),
    ) as unknown as Promise<ItemShape>;
  }

  iterate(params: { spaceId: SpaceId; boardId: BoardId; pageSize?: number; limit?: number }): PaginatedIterator<ItemShape> {
    return paginate<ItemShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ spaceId: params.spaceId, boardId: params.boardId, page, pageSize });
        return { data: (res.data ?? []) as ItemShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize: params.pageSize, limit: params.limit },
    );
  }

  async listAll(params: { spaceId: SpaceId; boardId: BoardId; pageSize?: number; limit?: number }): Promise<ItemShape[]> {
    const out: ItemShape[] = [];
    for await (const i of this.iterate(params)) out.push(i);
    return out;
  }
}

function planMutation(op: string, payload: Record<string, unknown>): DryRunPlan {
  return { dryRun: true, operation: op, payload };
}
