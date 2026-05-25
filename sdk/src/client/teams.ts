import type { PlakyClient } from "./client.js";
import { listTeams } from "../generated/operations/list-teams.js";
import { getTeam } from "../generated/operations/get-team.js";
import { paginate, type PaginatedIterator } from "../runtime/pagination.js";
import type { TeamId } from "../runtime/ids.js";
import type { PagedResult, TeamShape } from "./shapes.js";

export class TeamsResource {
  constructor(private readonly client: PlakyClient) {}

  list(query?: { page?: number; pageSize?: number }): Promise<PagedResult<TeamShape>> {
    return listTeams({ query: query as never }, this.client.requestOptions()) as unknown as Promise<PagedResult<TeamShape>>;
  }

  get(teamId: TeamId): Promise<TeamShape> {
    return getTeam({ teamId }, this.client.requestOptions()) as unknown as Promise<TeamShape>;
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
