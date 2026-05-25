// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getItem
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type getItemParams = {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  query?: QueryParamsType | undefined;
};

export type getItemResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function getItem(
  params: getItemParams,
  options: PlakyRequestOptions,
): Promise<getItemResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items/${params.itemId}`;
  return request<getItemResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "getItem",
  }, options);
}
