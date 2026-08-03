import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import { resolveExplicitIdempotencyKey } from "../runtime/idempotency.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId, BoardId, ItemGroupId } from "../runtime/ids.js";
import type { PagedResult, ItemGroupShape } from "./shapes.js";
import type { components } from "../generated/types.js";

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

  list(params: ItemGroupListParams, options?: PlakyRequestOverrides): Promise<PagedResult<ItemGroupShape>> {
    const { spaceId, boardId, ...query } = params;
    return this.client.request<PagedResult<ItemGroupShape>>(
      {
        method: "GET",
        path: `/v1/public/spaces/${idPathSegment(spaceId)}/boards/${idPathSegment(boardId)}/item-groups`,
        query,
        operationId: "listItemGroups",
      },
      options,
    );
  }

  /** Lazily iterate item groups across pages. */
  iterate(params: ItemGroupIteratorParams, options?: PlakyRequestOverrides): PaginatedIterator<ItemGroupShape> {
    const { limit, pageSize, ...scope } = params;
    return paginate<ItemGroupShape>(
      async ({ page, pageSize }) => {
        const result = await this.list({ ...scope, page, pageSize }, options);
        return {
          data: (result.data ?? []) as ItemGroupShape[],
          hasMore: result.hasMore === true,
          raw: result,
        };
      },
      { pageSize, limit },
    );
  }

  /** Collect every item group on the board. */
  async listAll(params: ItemGroupIteratorParams, options?: PlakyRequestOverrides): Promise<ItemGroupShape[]> {
    const groups: ItemGroupShape[] = [];
    for await (const group of this.iterate(params, options)) groups.push(group);
    return groups;
  }

  get(params: ItemGroupGetParams, options?: PlakyRequestOverrides): Promise<ItemGroupShape> {
    return this.client.request<ItemGroupShape>(
      {
        method: "GET",
        path: itemGroupPath(params),
        operationId: "getItemGroup",
      },
      options,
    );
  }

  create(params: ItemGroupCreateParams, options?: PlakyRequestOverrides): Promise<ItemGroupShape> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemGroupShape>(
      {
        method: "POST",
        path: `/v1/public/spaces/${idPathSegment(params.spaceId)}/boards/${idPathSegment(params.boardId)}/item-groups`,
        body: params.body,
        operationId: "createItemGroup",
      },
      { ...options, idempotencyKey },
    );
  }

  update(params: ItemGroupUpdateParams, options?: PlakyRequestOverrides): Promise<ItemGroupShape> {
    const idempotencyKey = resolveExplicitIdempotencyKey(params, options);
    return this.client.request<ItemGroupShape>(
      {
        method: "PUT",
        path: itemGroupPath(params),
        body: params.body,
        operationId: "updateItemGroup",
      },
      { ...options, idempotencyKey },
    );
  }

  async delete(params: ItemGroupDeleteParams, options?: PlakyRequestOverrides): Promise<void> {
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

  async archive(params: ItemGroupDeleteParams, options?: PlakyRequestOverrides): Promise<void> {
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
