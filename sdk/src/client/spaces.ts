import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { assertPagedResult, paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { SpaceId } from "../runtime/ids.js";
import type { StrictPagedResult, SpaceShape } from "./shapes.js";

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

/** Spaces resource. Access via `client.spaces`. */
export class SpacesResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * List a page of spaces in the workspace.
   *
   * @param query - Optional `expand`, `page`, and `pageSize`. The API is
   *   page-based; `pageSize` controls page size. See `docs/api-behavior.md`.
   * @param options - Per-request overrides.
   * @returns A page of spaces with `data` and `hasMore`.
   * @throws {import("../runtime/errors.js").PlakyApiError} On API errors.
   */
  async list(query?: SpaceListParams, options?: ResourceRequestOverrides): Promise<StrictPagedResult<SpaceShape>> {
    const response = await this.client.request<unknown>(
      {
        method: "GET",
        path: "/v1/public/spaces",
        query,
        operationId: "listSpaces",
      },
      options,
    );
    return assertPagedResult<SpaceShape>(response, "listSpaces");
  }

  /**
   * Fetch one space by id, optionally expanding relationships.
   *
   * @param spaceIdOrParams - A space id, or `{ spaceId, expand }`.
   * @param options - Per-request overrides.
   * @returns The space.
   * @throws {import("../runtime/errors.js").PlakyNotFoundError} If the space does not exist.
   * @example
   * ```ts
   * const space = await client.spaces.get(123);
   * const expanded = await client.spaces.get({ spaceId: 123, expand: ["board"] });
   * ```
   */
  get(spaceId: SpaceId | string | number, options?: ResourceRequestOverrides): Promise<SpaceShape>;
  get(params: SpaceGetParams, options?: ResourceRequestOverrides): Promise<SpaceShape>;
  get(spaceIdOrParams: SpaceId | string | number | SpaceGetParams, options?: ResourceRequestOverrides): Promise<SpaceShape> {
    const params = isSpaceGetParams(spaceIdOrParams) ? spaceIdOrParams : { spaceId: spaceIdOrParams };
    const { spaceId, ...query } = params;
    return this.client.request<SpaceShape>(
      {
        method: "GET",
        path: `/v1/public/spaces/${idPathSegment(spaceId)}`,
        query,
        operationId: "getSpace",
      },
      options,
    );
  }

  /**
   * Lazily iterate spaces across pages. `limit` is a client-side cap on total
   * items yielded (the API has no server-side `limit`/`offset`; it is strictly
   * page-based). See `docs/api-behavior.md`.
   *
   * @param opts - `expand`, `pageSize`, and optional client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(opts: SpaceIteratorParams = {}, options?: ResourceRequestOverrides): PaginatedIterator<SpaceShape> {
    const { limit, pageSize, ...query } = opts;
    return paginate<SpaceShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ ...query, page, pageSize }, options);
        return { data: res.data, hasMore: res.hasMore, raw: res };
      },
      { pageSize, limit },
    );
  }

  /**
   * Collect all spaces into an array, walking every page. Honors the client-side
   * `limit` if set.
   *
   * @param opts - `expand`, `pageSize`, and optional client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns Every matching space.
   */
  async listAll(opts: SpaceIteratorParams = {}, options?: ResourceRequestOverrides): Promise<SpaceShape[]> {
    const out: SpaceShape[] = [];
    for await (const s of this.iterate(opts, options)) out.push(s);
    return out;
  }
}

function isSpaceGetParams(value: SpaceId | string | number | SpaceGetParams): value is SpaceGetParams {
  return typeof value === "object" && value !== null && "spaceId" in value;
}
