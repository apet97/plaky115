// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSpaces
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type listSpacesParams = {
  query?: QueryParamsType | undefined;
};

export type listSpacesResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function listSpaces(
  params: listSpacesParams,
  options: PlakyRequestOptions,
): Promise<listSpacesResponse> {
  const path = `/v1/public/spaces`;
  return request<listSpacesResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "listSpaces",
  }, options);
}
