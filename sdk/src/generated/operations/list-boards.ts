// AUTO-GENERATED. Source: openapi/plaky115-operation-metadata.json operationId=listBoards
// Regenerate: npm run generate:operations
import type { paths } from "../types.js";
import { request } from "../../runtime/http.js";
import type { PlakyRequestOptions } from "../../runtime/http.js";

type RequestOp = paths["/v1/public/spaces/{spaceId}/boards"]["get"];
type QueryParamsType = RequestOp extends { parameters: { query?: infer Q } } ? Q : Record<string, never>;

export type listBoardsParams = {
  spaceId: string | number;
  query?: QueryParamsType | undefined;
};

export type listBoardsResponse =
  RequestOp extends { responses: { 200: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 201: { content: { "application/json": infer R } } } } ? R :
  RequestOp extends { responses: { 204: unknown } } ? void :
  unknown;

export async function listBoards(
  params: listBoardsParams,
  options: PlakyRequestOptions,
): Promise<listBoardsResponse> {
  const path = `/v1/public/spaces/${params.spaceId}/boards`;
  return request<listBoardsResponse>({
    method: "GET",
    path,
    query: params.query as Record<string, unknown> | undefined,
    operationId: "listBoards",
  }, options);
}
