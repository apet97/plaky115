import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { assertPagedResult, paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { resolveExplicitIdempotencyKey } from "../runtime/idempotency.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemGroupId } from "../runtime/ids.js";
import type { StrictPagedResult, ItemGroupShape } from "./shapes.js";
import type { components } from "../generated/types.js";
import { normalizeItemGroupCreatePlan, normalizeItemGroupUpdatePlan } from "../workflows/mutation-plans.js";

export type ItemGroupCreateBody = components["schemas"]["ItemGroupCreateRequest"];
export type ItemGroupUpdateBody = components["schemas"]["ItemGroupUpdateRequest"];

type ItemGroupBoardParams = {
  spaceId: SpaceId | string | number;
  boardId: BoardId | string | number;
};

export type ItemGroupListParams = ItemGroupBoardParams & {
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type ItemGroupIteratorParams = Omit<ItemGroupListParams, "page"> & {
  limit?: number | undefined;
};

export type ItemGroupGetParams = ItemGroupBoardParams & {
  itemGroupId: ItemGroupId | string | number;
};

export type ItemGroupCreateParams = ItemGroupBoardParams & {
  body: ItemGroupCreateBody;
  idempotencyKey?: string | undefined;
};

export type ItemGroupUpdateParams = ItemGroupGetParams & {
  body: ItemGroupUpdateBody;
  idempotencyKey?: string | undefined;
};

export type ItemGroupDeleteParams = ItemGroupGetParams & {
  idempotencyKey?: string | undefined;
};

/** Item Groups resource. Access via `client.itemGroups`. */
export class ItemGroupsResource {
  constructor(private readonly client: PlakyClient) {}

  async list(params: ItemGroupListParams, options?: ResourceRequestOverrides): Promise<StrictPagedResult<ItemGroupShape>> {
    const { spaceId, boardId, ...query } = params;
    const response = await this.client.request<unknown>(
      {
        method: "GET",
        path: `/v1/public/spaces/${idPathSegment(spaceId)}/boards/${idPathSegment(boardId)}/item-groups`,
        query,
        operationId: "listItemGroups",
      },
      options,
    );
    return assertPagedResult<ItemGroupShape>(response, "listItemGroups");
  }

  /** Lazily iterate item groups across pages. */
  iterate(params: ItemGroupIteratorParams, options?: ResourceRequestOverrides): PaginatedIterator<ItemGroupShape> {
    const { limit, pageSize, ...scope } = params;
    return paginate<ItemGroupShape>(
      async ({ page, pageSize }) => {
        const result = await this.list({ ...scope, page, pageSize }, options);
        return {
          data: result.data,
          hasMore: result.hasMore,
          raw: result,
        };
      },
      { pageSize, limit },
    );
  }

  /** Collect every item group on the board. */
  async listAll(params: ItemGroupIteratorParams, options?: ResourceRequestOverrides): Promise<ItemGroupShape[]> {
    const groups: ItemGroupShape[] = [];
    for await (const group of this.iterate(params, options)) groups.push(group);
    return groups;
  }

  get(params: ItemGroupGetParams, options?: ResourceRequestOverrides): Promise<ItemGroupShape> {
    return this.client.request<ItemGroupShape>(
      {
        method: "GET",
        path: itemGroupPath(params),
        operationId: "getItemGroup",
      },
      options,
    );
  }

  create(params: ItemGroupCreateParams, options?: ResourceRequestOverrides): Promise<ItemGroupShape> {
    const normalized = normalizeItemGroupCreatePlan(params);
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemGroupShape>(
      {
        method: "POST",
        path: `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/item-groups`,
        body: normalized.body,
        operationId: "createItemGroup",
      },
      { ...options, idempotencyKey },
    );
  }

  update(params: ItemGroupUpdateParams, options?: ResourceRequestOverrides): Promise<ItemGroupShape> {
    const normalized = normalizeItemGroupUpdatePlan(params);
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemGroupShape>(
      {
        method: "PUT",
        path: itemGroupPath(params),
        body: normalized.body,
        operationId: "updateItemGroup",
      },
      { ...options, idempotencyKey },
    );
  }

  async delete(params: ItemGroupDeleteParams, options?: ResourceRequestOverrides): Promise<void> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    await this.client.request<void>(
      {
        method: "DELETE",
        path: itemGroupPath(params),
        operationId: "deleteItemGroup",
        responseType: "void",
      },
      { ...options, idempotencyKey },
    );
  }

  async archive(params: ItemGroupDeleteParams, options?: ResourceRequestOverrides): Promise<void> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    await this.client.request<void>(
      {
        method: "PUT",
        path: `${itemGroupPath(params)}/archive`,
        operationId: "archiveItemGroup",
        responseType: "void",
      },
      { ...options, idempotencyKey },
    );
  }
}

function itemGroupPath(params: ItemGroupGetParams): string {
  return `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/item-groups/${idPathSegment(params.itemGroupId)}`;
}
