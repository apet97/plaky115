// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listUsers
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/users"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type listUsersParams = {
  query?: QueryParamsType | undefined;
};

export type listUsersResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function listUsers(
  params: listUsersParams,
  options: PlakyRequestOptions,
): Promise<listUsersResponse> {
  const path = `/v1/public/users`;
  return request<listUsersResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "listUsers",
  }, options);
}
