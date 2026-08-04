import type { PlakyClient } from "./client.js";
import { idPathSegment } from "./path.js";
import { assertPagedResult, paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { ResourceRequestOverrides } from "../runtime/types.js";
import type { TeamId } from "../runtime/ids.js";
import type { StrictPagedResult, TeamShape } from "./shapes.js";

/** Teams resource. Access via `client.teams`. */
export class TeamsResource {
  constructor(private readonly client: PlakyClient) {}

  /**
   * List a page of workspace teams.
   *
   * @param query - Optional `page`/`pageSize`.
   * @param options - Per-request overrides.
   * @returns A page of teams with `data` and `hasMore`.
   */
  async list(query?: { page?: number; pageSize?: number }, options?: ResourceRequestOverrides): Promise<StrictPagedResult<TeamShape>> {
    const response = await this.client.request<unknown>(
      {
        method: "GET",
        path: "/v1/public/teams",
        query,
        operationId: "listTeams",
      },
      options,
    );
    return assertPagedResult<TeamShape>(response, "listTeams");
  }

  /**
   * Fetch one team by id.
   *
   * @param teamId - The team id.
   * @param options - Per-request overrides.
   * @returns The team.
   * @throws {import("../runtime/errors.js").PlakyNotFoundError} If the team does not exist.
   */
  get(teamId: TeamId | string | number, options?: ResourceRequestOverrides): Promise<TeamShape> {
    return this.client.request<TeamShape>(
      {
        method: "GET",
        path: `/v1/public/teams/${idPathSegment(teamId)}`,
        operationId: "getTeam",
      },
      options,
    );
  }

  /**
   * Lazily iterate teams across pages. `limit` is a client-side cap.
   *
   * @param opts - Optional `pageSize` and client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(opts: { pageSize?: number; limit?: number } = {}, options?: ResourceRequestOverrides): PaginatedIterator<TeamShape> {
    return paginate<TeamShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ page, pageSize }, options);
        return { data: res.data, hasMore: res.hasMore, raw: res };
      },
      opts,
    );
  }

  /**
   * Collect all teams into an array, walking every page.
   *
   * @param opts - Optional `pageSize` and client-side `limit`.
   * @param options - Per-request overrides applied to every page request.
   * @returns Every team.
   */
  async listAll(opts: { pageSize?: number; limit?: number } = {}, options?: ResourceRequestOverrides): Promise<TeamShape[]> {
    const out: TeamShape[] = [];
    for await (const t of this.iterate(opts, options)) out.push(t);
    return out;
  }
}
