// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=createItem
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items"]["post"];
type RequestBodyType = RequestOp extends { requestBody: { content: { "application/json": infer B } } } ? B : never;
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type createItemParams = {
  spaceId: string | number;
  boardId: string | number;
  body: RequestBodyType;
  query?: QueryParamsType | undefined;
};

export type createItemResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function createItem(
  params: createItemParams,
  options: PlakyRequestOptions,
): Promise<createItemResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items`;
  return request<createItemResponse>({
    method: "POST",
    path,
    query: params.query as Record<string, unknown> | undefined,
    body: params.body,
    operationId: "createItem",
  }, options);
}
