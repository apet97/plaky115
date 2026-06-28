import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { TeamId } from "../runtime/ids.js";
import type { PagedResult, TeamShape } from "./shapes.js";

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
  list(query?: { page?: number; pageSize?: number }, options?: PlakyRequestOverrides): Promise<PagedResult<TeamShape>> {
    return this.client.request<PagedResult<TeamShape>>(
      {
        method: "GET",
        path: "/v1/public/teams",
        query,
        operationId: "listTeams",
      },
      options,
    );
  }

  /**
   * Fetch one team by id.
   *
   * @param teamId - The team id.
   * @param options - Per-request overrides.
   * @returns The team.
   * @throws {import("../runtime/errors.js").PlakyNotFoundError} If the team does not exist.
   */
  get(teamId: TeamId | string | number, options?: PlakyRequestOverrides): Promise<TeamShape> {
    return this.client.request<TeamShape>(
      {
        method: "GET",
        path: `/v1/public/teams/${pathSegment(teamId)}`,
        operationId: "getTeam",
      },
      options,
    );
  }

  /**
   * Lazily iterate teams across pages. `limit` is a client-side cap.
   *
   * @param opts - Optional `pageSize` and client-side `limit`.
   * @returns An async iterator with `firstPage()` and `toArray()` helpers.
   */
  iterate(opts: { pageSize?: number; limit?: number } = {}): PaginatedIterator<TeamShape> {
    return paginate<TeamShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ page, pageSize });
        return { data: (res.data ?? []) as TeamShape[], hasMore: res.hasMore === true, raw: res };
      },
      opts,
    );
  }

  /**
   * Collect all teams into an array, walking every page.
   *
   * @param opts - Optional `pageSize` and client-side `limit`.
   * @returns Every team.
   */
  async listAll(opts: { pageSize?: number; limit?: number } = {}): Promise<TeamShape[]> {
    const out: TeamShape[] = [];
    for await (const t of this.iterate(opts)) out.push(t);
    return out;
  }
}
