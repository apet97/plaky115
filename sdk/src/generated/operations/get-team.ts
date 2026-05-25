// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getTeam
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/teams/{teamId}"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type getTeamParams = {
  teamId: string | number;
  query?: QueryParamsType | undefined;
};

export type getTeamResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function getTeam(
  params: getTeamParams,
  options: PlakyRequestOptions,
): Promise<getTeamResponse> {
  const path = `/v1/public/teams/${params.teamId}`;
  return request<getTeamResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "getTeam",
  }, options);
}
