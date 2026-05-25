import type { PlakyClient } from "./client.js";
import { pathSegment } from "./path.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { PlakyRequestOverrides } from "../runtime/types.js";
import type { TeamId } from "../runtime/ids.js";
import type { PagedResult, TeamShape } from "./shapes.js";

export class TeamsResource {
  constructor(private readonly client: PlakyClient) {}

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

  iterate(opts: { pageSize?: number; limit?: number } = {}): PaginatedIterator<TeamShape> {
    return paginate<TeamShape>(
      async ({ page, pageSize }) => {
        const res = await this.list({ page, pageSize });
        return { data: (res.data ?? []) as TeamShape[], hasMore: res.hasMore === true, raw: res };
      },
      opts,
    );
  }

  async listAll(opts: { pageSize?: number; limit?: number } = {}): Promise<TeamShape[]> {
    const out: TeamShape[] = [];
    for await (const t of this.iterate(opts)) out.push(t);
    return out;
  }
}
