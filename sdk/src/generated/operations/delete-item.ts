// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItem
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}"]["delete"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type deleteItemParams = {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  query?: QueryParamsType | undefined;
};

export type deleteItemResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function deleteItem(
  params: deleteItemParams,
  options: PlakyRequestOptions,
): Promise<deleteItemResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items/${params.itemId}`;
  return request<deleteItemResponse>({
    method: "DELETE",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "deleteItem",
  }, options);
}
