// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listSubitems
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}/items/{itemId}/sub-items"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type listSubitemsParams = {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  query?: QueryParamsType | undefined;
};

export type listSubitemsResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function listSubitems(
  params: listSubitemsParams,
  options: PlakyRequestOptions,
): Promise<listSubitemsResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}/items/${params.itemId}/sub-items`;
  return request<listSubitemsResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "listSubitems",
  }, options);
}
