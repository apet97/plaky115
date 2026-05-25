// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getSpace
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type getSpaceParams = {
  spaceId: string | number;
  query?: QueryParamsType | undefined;
};

export type getSpaceResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function getSpace(
  params: getSpaceParams,
  options: PlakyRequestOptions,
): Promise<getSpaceResponse> {
  const path = `/v1/public/spaces/${params.spaceId}`;
  return request<getSpaceResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "getSpace",
  }, options);
}
