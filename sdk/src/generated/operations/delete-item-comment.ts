// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=deleteItemComment
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}"]["delete"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type deleteItemCommentParams = {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  itemCommentId: string | number;
  query?: QueryParamsType | undefined;
};

export type deleteItemCommentResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function deleteItemComment(
  params: deleteItemCommentParams,
  options: PlakyRequestOptions,
): Promise<deleteItemCommentResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items/${params.itemId}/comments/${params.itemCommentId}`;
  return request<deleteItemCommentResponse>({
    method: "DELETE",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "deleteItemComment",
  }, options);
}
