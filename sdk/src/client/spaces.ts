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

  /**
   * Lazily iterate spaces across pages. `limit` is a client-side cap on total
   * items yielded (the API has no server-side `limit`/`offset`; it is strictly
   * page-based). See `docs/api-behavior.md`.
   *
   * @param opts - `expand`, `pageSize`, and optional client-side `limit`.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
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

  /**
   * Collect all spaces into an array, walking every page. Honors the client-side
   * `limit` if set.
   *
   * @param opts - `expand`, `pageSize`, and optional client-side `limit`.
   * @returns Every matching space.
   */
  async listAll(opts: SpaceIteratorParams = {}): Promise<SpaceShape[]> {
    const out: SpaceShape[] = [];
    for await (const s of this.iterate(opts)) out.push(s);
    return out;
  }
}

function isSpaceGetParams(value: SpaceId | string | number | SpaceGetParams): value is SpaceGetParams {
  return typeof value === "object" && value !== null && "spaceId" in value;
}
