// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getCurrentUser
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/users/me"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type getCurrentUserParams = {
  query?: QueryParamsType | undefined;
};

export type getCurrentUserResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function getCurrentUser(
  params: getCurrentUserParams,
  options: PlakyRequestOptions,
): Promise<getCurrentUserResponse> {
  const path = `/v1/public/users/me`;
  return request<getCurrentUserResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "getCurrentUser",
  }, options);
}
