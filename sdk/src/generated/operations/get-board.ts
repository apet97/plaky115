// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=getBoard
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards/{boardId}"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type getBoardParams = {
  spaceId: string | number;
  boardId: string | number;
  query?: QueryParamsType | undefined;
};

export type getBoardResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function getBoard(
  params: getBoardParams,
  options: PlakyRequestOptions,
): Promise<getBoardResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards/${params.boardId}`;
  return request<getBoardResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "getBoard",
  }, options);
}
