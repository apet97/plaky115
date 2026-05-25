// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=replaceCommentReactions
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/comments/{itemCommentId}/reactions"]["put"];
type RequestBodyType = RequestOp extends { requestBody: { content: { "application/json": infer B } } } ? B : never;
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type replaceCommentReactionsParams = {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  itemCommentId: string | number;
  body: RequestBodyType;
  query?: QueryParamsType | undefined;
};

export type replaceCommentReactionsResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function replaceCommentReactions(
  params: replaceCommentReactionsParams,
  options: PlakyRequestOptions,
): Promise<replaceCommentReactionsResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items/${params.itemId}/comments/${params.itemCommentId}/reactions`;
  return request<replaceCommentReactionsResponse>({
    method: "PUT",
    path,
    query: params.query as Record<string, unknown> | undefined,
    body: params.body,
    operationId: "replaceCommentReactions",
  }, options);
}
