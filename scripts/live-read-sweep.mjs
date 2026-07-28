#!/usr/bin/env node
import { pathToFileURL } from "node:url";

const maxBytes = 16 * 1024 * 1024;

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
      if (operation.signed && (typeof data?.url !== "string" || (data.expiresInSeconds !== undefined && typeof data.expiresInSeconds !== "number"))) {
        throw new Error("signed download metadata shape is invalid");
      }
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
  const serverURL = normalizeServerURL(process.env.PLAKY115_BASE_URL ?? "https://api.plaky.com");
  const apiCall = async ({ method, path }) => {
    const response = await fetch(new URL(path, `${serverURL}/`), { method, headers: { "X-API-Key": apiKey, Accept: "application/json" }, redirect: "error" });
    const data = await boundedJson(response);
    if (!response.ok) throw Object.assign(new Error("Plaky read failed"), { status: response.status });
    return { data, status: response.status };
  };
  const ids = await discover(apiCall);
  const operations = buildReadOperations(ids);
  const client = new PlakyClient({ apiKey, serverURL, maxResponseBytes: maxBytes });
  const sdkCall = async ({ method, path }) => {
    const response = await client.requestWithResponse({ method, path });
    return { data: response.data, status: response.status };
  };
  const api = await runSurface("api", operations, apiCall);
  const sdk = await runSurface("sdk", operations, sdkCall);
  if ([...api, ...sdk].some((record) => record.status === "FAIL")) process.exitCode = 1;
}

function normalizeServerURL(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !/(^|\.)api\.plaky\.com$/.test(url.hostname)) {
    throw new Error("PLAKY115_BASE_URL must be an HTTPS Plaky API host without credentials, query, or fragment");
  }
  return url.toString().replace(/\/$/, "");
}

async function boundedJson(response) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new Error("response exceeds read-sweep limit");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error("response exceeds read-sweep limit");
  if (bytes.byteLength === 0) return undefined;
  return JSON.parse(new TextDecoder().decode(bytes));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
