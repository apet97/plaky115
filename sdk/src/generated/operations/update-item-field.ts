// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=updateItemField
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/fields/{itemFieldKey}"]["patch"];
type RequestBodyType = RequestOp extends { requestBody: { content: { "application/json": infer B } } } ? B : never;
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type updateItemFieldParams = {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  itemFieldKey: string | number;
  body: RequestBodyType;
  query?: QueryParamsType | undefined;
};

export type updateItemFieldResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function updateItemField(
  params: updateItemFieldParams,
  options: PlakyRequestOptions,
): Promise<updateItemFieldResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items/${params.itemId}/fields/${params.itemFieldKey}`;
  return request<updateItemFieldResponse>({
    method: "PATCH",
    path,
    query: params.query as Record<string, unknown> | undefined,
    body: params.body,
    operationId: "updateItemField",
  }, options);
}
