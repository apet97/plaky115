#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { normalizePlakyBaseURL, summarizeDownloadLink } from "./live/contracts.mjs";
import { MAX_LIVE_RESPONSE_BYTES, readBoundedLiveJSON } from "./live/http.mjs";

export function buildReadOperations(ids = {}) {
  const path = (parts) => `/v1/public/${parts.map((part) => encodeURIComponent(String(part))).join("/")}`;
  return [
    op("listSpaces", path(["spaces"])),
    op("getSpace", ids.spaceId && path(["spaces", ids.spaceId]), "space"),
    op("listBoards", ids.spaceId && path(["spaces", ids.spaceId, "boards"]), "space"),
    op("getBoard", ids.spaceId && ids.boardId && path(["spaces", ids.spaceId, "boards", ids.boardId]), "board"),
    op("listItemGroups", ids.spaceId && ids.boardId && path(["spaces", ids.spaceId, "boards", ids.boardId, "item-groups"]), "board"),
    op("getItemGroup", ids.spaceId && ids.boardId && ids.itemGroupId && path(["spaces", ids.spaceId, "boards", ids.boardId, "item-groups", ids.itemGroupId]), "item-group"),
    op("listItems", ids.spaceId && ids.boardId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items"]), "board"),
    op("getItem", ids.spaceId && ids.boardId && ids.itemId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items", ids.itemId]), "item"),
    op("listItemComments", ids.spaceId && ids.boardId && ids.itemId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items", ids.itemId, "comments"]), "item"),
    op("listItemFiles", ids.spaceId && ids.boardId && ids.itemId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items", ids.itemId, "files"]), "item"),
    op("getItemFile", ids.spaceId && ids.boardId && ids.itemId && ids.itemFileId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items", ids.itemId, "files", ids.itemFileId]), "file"),
    op("getItemFileDownload", ids.spaceId && ids.boardId && ids.itemId && ids.itemFileId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items", ids.itemId, "files", ids.itemFileId, "download"]), "file", true),
    op("listSubitems", ids.spaceId && ids.boardId && ids.itemId && path(["spaces", ids.spaceId, "boards", ids.boardId, "items", ids.itemId, "sub-items"]), "item"),
    op("listTeams", path(["teams"])),
    op("getTeam", ids.teamId && path(["teams", ids.teamId]), "team"),
    op("listUsers", path(["users"])),
    op("getCurrentUser", path(["users", "me"])),
  ];
}

function op(operationId, path, prerequisite, signed = false) {
  return { operationId, method: "GET", path: path || null, prerequisite, signed };
}

export async function runSurface(surface, operations, call, emit = console.log) {
  const records = [];
  for (const operation of operations) {
    if (!operation.path) {
      const record = { surface, operationId: operation.operationId, status: "SKIP_PREREQUISITE" };
      records.push(record); emit(JSON.stringify(record)); continue;
    }
    try {
      const { data, status } = await call(operation);
      if (operation.signed) summarizeDownloadLink(data);
      const record = { surface, operationId: operation.operationId, status: "PASS", httpStatus: status, ...safeCounts(data) };
      records.push(record); emit(JSON.stringify(record));
    } catch (error) {
      const httpStatus = Number.isInteger(error?.status) ? error.status : undefined;
      const record = { surface, operationId: operation.operationId, status: "FAIL", ...(httpStatus ? { httpStatus } : {}) };
      records.push(record); emit(JSON.stringify(record));
    }
  }
  return records;
}

export function validateSurfaceCoverage(records) {
  if (records.length !== 17) throw new Error("read sweep must account for all 17 documented GET operations");
  if (records.some((record) => record.status === "FAIL")) throw new Error("read sweep contains failed operations");
  const skipped = records.filter((record) => record.status === "SKIP_PREREQUISITE").map((record) => record.operationId).sort();
  if (skipped.length !== 0 && JSON.stringify(skipped) !== JSON.stringify(["getItemFile", "getItemFileDownload"])) {
    throw new Error("read sweep may skip only getItemFile and getItemFileDownload together");
  }
  return records;
}

function safeCounts(data) {
  if (Array.isArray(data)) return { itemCount: data.length };
  if (Array.isArray(data?.data)) return { itemCount: data.data.length, ...(typeof data.hasMore === "boolean" ? { hasMore: data.hasMore } : {}) };
  return {};
}

async function discover(call) {
  const ids = {
    spaceId: numeric(process.env.PLAKY115_READ_SPACE_ID),
    boardId: numeric(process.env.PLAKY115_READ_BOARD_ID),
    itemId: numeric(process.env.PLAKY115_READ_ITEM_ID),
  };
  const first = (value) => Array.isArray(value) ? value[0] : value?.data?.[0];
  if (!ids.spaceId) ids.spaceId = first((await call(op("listSpaces", "/v1/public/spaces"))).data)?.id;
  if (ids.spaceId && !ids.boardId) ids.boardId = first((await call(op("listBoards", `/v1/public/spaces/${encodeURIComponent(ids.spaceId)}/boards`))).data)?.id;
  if (ids.spaceId && ids.boardId) {
    const base = `/v1/public/spaces/${encodeURIComponent(ids.spaceId)}/boards/${encodeURIComponent(ids.boardId)}`;
    if (!ids.itemId) ids.itemId = first((await call(op("listItems", `${base}/items`))).data)?.id;
    ids.itemGroupId = first((await call(op("listItemGroups", `${base}/item-groups`))).data)?.id;
    if (ids.itemId) ids.itemFileId = first((await call(op("listItemFiles", `${base}/items/${encodeURIComponent(ids.itemId)}/files`))).data)?.id;
  }
  ids.teamId = first((await call(op("listTeams", "/v1/public/teams"))).data)?.id;
  return ids;
}

function numeric(value) {
  if (value === undefined || value === "") return undefined;
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error("optional starting IDs must be canonical decimal strings");
  return value;
}

async function main() {
  const { PlakyClient } = await import("../sdk/esm/index.js");
  const apiKey = process.env.PLAKY115_API_KEY ?? process.env.PLAKY115_API_KEY_AUTH;
  if (typeof apiKey !== "string" || apiKey.trim().length < 8) throw new Error("a Plaky API key is required through the environment");
  const serverURL = normalizePlakyBaseURL(process.env.PLAKY115_BASE_URL ?? "https://api.plaky.com");
  const apiCall = async ({ method, path }) => {
    const response = await fetch(new URL(path, `${serverURL}/`), { method, headers: { "X-API-Key": apiKey, Accept: "application/json" }, redirect: "error" });
    const data = await boundedJson(response);
    if (!response.ok) throw Object.assign(new Error("Plaky read failed"), { status: response.status });
    return { data, status: response.status };
  };
  const ids = await discover(apiCall);
  const operations = buildReadOperations(ids);
  const client = new PlakyClient({ apiKey, serverURL, maxResponseBytes: MAX_LIVE_RESPONSE_BYTES });
  const sdkCall = async ({ method, path }) => {
    const response = await client.requestWithResponse({ method, path });
    return { data: response.data, status: response.status };
  };
  const api = await runSurface("api", operations, apiCall);
  const sdk = await runSurface("sdk", operations, sdkCall);
  validateSurfaceCoverage(api);
  validateSurfaceCoverage(sdk);
}

async function boundedJson(response) {
  return readBoundedLiveJSON(response);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
