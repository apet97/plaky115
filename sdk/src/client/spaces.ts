import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { SpaceId } from "../runtime/ids.js";
import type { PagedResult, SpaceShape } from "./shapes.js";

export type SpaceExpand = "board";

export type SpaceListParams = {
  expand?: readonly SpaceExpand[] | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
};

export type SpaceGetParams = {
  spaceId: SpaceId | string | number;
  expand?: readonly SpaceExpand[] | undefined;
};

export type SpaceIteratorParams = Omit<SpaceListParams, "page"> & {
  limit?: number | undefined;
};

export class SpacesResource {
  constructor(private readonly client: PlakyClient) {}

  list(query?: SpaceListParams, options?: PlakyRequestOverrides): Promise<PagedResult<SpaceShape>> {
    return this.client.request<PagedResult<SpaceShape>>(
      {
        method: "GET",
        path: "/v1/public/spaces",
        query,
        operationId: "listSpaces",
      },
      options,
    );
  }

  get(spaceId: SpaceId | string | number, options?: PlakyRequestOverrides): Promise<SpaceShape>;
  get(params: SpaceGetParams, options?: PlakyRequestOverrides): Promise<SpaceShape>;
  get(spaceIdOrParams: SpaceId | string | number | SpaceGetParams, options?: PlakyRequestOverrides): Promise<SpaceShape> {
    const params = isSpaceGetParams(spaceIdOrParams) ? spaceIdOrParams : { spaceId: spaceIdOrParams };
    const { spaceId, ...query } = params;
    return this.client.request<SpaceShape>(
      {
        method: "GET",
        path: `/v1/public/spaces/${pathSegment(spaceId)}`,
        query,
        operationId: "getSpace",
      },
      options,
    );
  }

  iterate(opts: SpaceIteratorParams = {}): PaginatedIterator<SpaceShape> {
    const { limit, pageSize, ...query } = opts;
    return paginate<SpaceShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...query, page, pageSize });
        return { data: (res.data ?? []) as SpaceShape[], hasMore: res.hasMore === true, raw: res };
      },
      { pageSize, limit },
    );
  }

  async listAll(opts: SpaceIteratorParams = {}): Promise<SpaceShape[]> {
    const out: SpaceShape[] = [];
    for await (const s of this.iterate(opts)) out.push(s);
    return out;
  }
}

function isSpaceGetParams(value: SpaceId | string | number | SpaceGetParams): value is SpaceGetParams {
  return typeof value === "object" && value !== null && "spaceId" in value;
}
