// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listTeams
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/teams"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type listTeamsParams = {
  query?: QueryParamsType | undefined;
};

export type listTeamsResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function listTeams(
  params: listTeamsParams,
  options: PlakyRequestOptions,
): Promise<listTeamsResponse> {
  const path = `/v1/public/teams`;
  return request<listTeamsResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "listTeams",
  }, options);
}
