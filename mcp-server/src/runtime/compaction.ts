import { PlakyResponseContractError, redact, utf8ByteLength } from "plaky115";
import { assertPagedResult } from "plaky115/runtime/pagination.js";
import type { CompactKind, McpRespondOptions } from "./types.js";

type Record_ = Record<string, unknown>;

export const MAX_MCP_RAW_BYTES = 128 * 1024;
export const MAX_MCP_STRUCTURED_BYTES = 1 * 1024 * 1024;

export class McpResponseLimitError extends Error {
  readonly code = "response-too-large";
  readonly maximum: number;

  constructor(maximum = MAX_MCP_STRUCTURED_BYTES) {
    super(`MCP structured response exceeds the ${maximum}-byte limit.`);
    this.name = "McpResponseLimitError";
    this.maximum = maximum;
  }
}

function asRecord(value: unknown): Record_ {
  return value !== null && typeof value === "object" ? (value as Record_) : {};
}

function readArray(record: Record_, key: string): unknown[] {
  const v = record[key];
  return Array.isArray(v) ? v : [];
}

function copyIfPresent(src: Record_, dst: Record_, key: string): void {
  if (src[key] !== undefined) dst[key] = src[key];
}

export function compactItem(value: unknown, options: McpRespondOptions = {}): Record_ {
  const item = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(item, out, "id");
  copyIfPresent(item, out, "title");
  copyIfPresent(item, out, "archived");
  copyIfPresent(item, out, "deleted");
  addBoundedRaw(out, value, options);
  return out;
}

export function compactBoard(value: unknown, options: McpRespondOptions = {}): Record_ {
  const board = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(board, out, "id");
  copyIfPresent(board, out, "title");
  out["fieldCount"] = readArray(board, "fields").length;
  out["groupCount"] = readArray(board, "groups").length;
  addBoundedRaw(out, value, options);
  return out;
}

export function compactSpace(value: unknown, options: McpRespondOptions = {}): Record_ {
  const space = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(space, out, "id");
  copyIfPresent(space, out, "title");
  out["boards"] = readArray(space, "boards").map((b) => compactBoard(b, withoutRaw(options)));
  addBoundedRaw(out, value, options);
  return out;
}

export function compactComment(value: unknown, options: McpRespondOptions = {}): Record_ {
  const c = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(c, out, "id");
  // `content`/`createdBy` are the real API response fields; `text`/`author` are
  // the request-only / deprecated compatibility aliases (kept if present).
  copyIfPresent(c, out, "content");
  copyIfPresent(c, out, "text");
  copyIfPresent(c, out, "createdAt");
  copyIfPresent(c, out, "createdBy");
  copyIfPresent(c, out, "author");
  addBoundedRaw(out, value, options);
  return out;
}

export function compactItemGroup(value: unknown, options: McpRespondOptions = {}): Record_ {
  const group = asRecord(value);
  const out: Record_ = {};
  for (const key of ["id", "title", "color", "ranking"]) copyIfPresent(group, out, key);
  addBoundedRaw(out, value, options);
  return out;
}

export function compactItemFile(value: unknown, options: McpRespondOptions = {}): Record_ {
  const file = asRecord(value);
  const out: Record_ = {};
  for (const key of ["id", "name", "description", "size", "extension", "fileType", "uploadedBy", "createdAt"]) {
    copyIfPresent(file, out, key);
  }
  addBoundedRaw(out, value, options);
  return out;
}

export function compactDownloadLink(value: unknown, options: McpRespondOptions = {}): Record_ {
  const link = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(link, out, "url");
  copyIfPresent(link, out, "expiresInSeconds");
  addBoundedRaw(out, value, options);
  return out;
}

export function compactWorkspace(value: unknown, options: McpRespondOptions = {}): Record_ {
  if (!Array.isArray(value)) throw new PlakyResponseContractError("workspaceMap", "/", { cause: value });
  const spaces = value;
  const data = spaces.map((spaceValue) => {
    const space = asRecord(spaceValue);
    const boards = readArray(space, "boards").map((boardValue) => compactBoard(boardValue, withoutRaw(options)));
    const summary: Record_ = {};
    copyIfPresent(space, summary, "id");
    copyIfPresent(space, summary, "title");
    summary["boardCount"] = boards.length;
    summary["boards"] = boards;
    return summary;
  });
  const out: Record_ = { data, complete: true, truncated: false, value: data };
  Object.assign(out, boundedRaw(value, options));
  return out;
}

export function compactList(value: unknown, kind: CompactKind, options: McpRespondOptions = {}): Record_ {
  const page = assertPagedResult(value, `mcp.compact.${kind}`);
  const compactItems = page.data.map((it) => compactByKind(it, kind, withoutRaw(options)));
  return {
    data: compactItems,
    hasMore: page.hasMore,
    ...boundedRaw(value, options),
  };
}

function compactDetailedList(value: Record_, kind: CompactKind, options: McpRespondOptions): Record_ {
  if (!Array.isArray(value["data"])) throw new Error(`mcp.compact.${kind}: detailed data must be an array`);
  if (typeof value["complete"] !== "boolean" || typeof value["truncated"] !== "boolean") {
    throw new Error(`mcp.compact.${kind}: detailed completeness fields are required`);
  }
  const out: Record_ = {
    data: value["data"].map((item) => compactByKind(item, kind, withoutRaw(options))),
    scanned: value["scanned"],
    matched: value["matched"],
    complete: value["complete"],
    truncated: value["truncated"],
  };
  for (const key of ["continuation", "nextCursor", "nextPage"]) copyIfPresent(value, out, key);
  Object.assign(out, boundedRaw(value, options));
  return out;
}

export function compactByKind(value: unknown, kind: CompactKind, options: McpRespondOptions = {}): unknown {
  if (kind === "workspace") return compactWorkspace(value, options);
  // Some endpoints (notably listItemComments) return a bare JSON array rather
  // than a { data, hasMore } envelope. Normalize it to the same paged shape so
  // each element is compacted and the result stays a schema-valid object.
  if (Array.isArray(value)) {
    return {
      data: value.map((it) => compactByKind(it, kind, withoutRaw(options))),
      hasMore: false,
      ...boundedRaw(value, options),
    };
  }
  if (isDetailedList(value)) return compactDetailedList(value, kind, options);
  if (isPageLike(value)) {
    return compactList(value, kind, options);
  }
  if (kind === "item") return compactItem(value, options);
  if (kind === "board") return compactBoard(value, options);
  if (kind === "space") return compactSpace(value, options);
  if (kind === "comment") return compactComment(value, options);
  if (kind === "itemGroup") return compactItemGroup(value, options);
  if (kind === "itemFile") return compactItemFile(value, options);
  if (kind === "downloadLink") return compactDownloadLink(value, options);
  return value;
}

function isPageLike(value: unknown): value is Record_ {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.prototype.hasOwnProperty.call(value, "data") || Object.prototype.hasOwnProperty.call(value, "hasMore");
}

function isDetailedList(value: unknown): value is Record_ {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record_;
  return Array.isArray(record["data"]) && ("complete" in record || "truncated" in record || "scanned" in record);
}

function withoutRaw(options: McpRespondOptions): McpRespondOptions {
  return options.includeRaw === true ? { ...options, includeRaw: false } : options;
}

export function serializeForMcp(value: unknown): string {
  const serialized = redact(JSON.stringify(value ?? null));
  if (utf8ByteLength(serialized) > MAX_MCP_STRUCTURED_BYTES) throw new McpResponseLimitError();
  return serialized;
}

export function structuredForMcp(value: unknown): Record<string, unknown> {
  const structured = value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };
  return JSON.parse(serializeForMcp(structured)) as Record<string, unknown>;
}

function boundedRaw(value: unknown, options: McpRespondOptions): Record_ {
  if (options.includeRaw !== true) return {};
  const serialized = JSON.stringify(value ?? null);
  return utf8ByteLength(serialized) <= MAX_MCP_RAW_BYTES ? { raw: value } : { rawOmitted: true };
}

function addBoundedRaw(out: Record_, value: unknown, options: McpRespondOptions): void {
  Object.assign(out, boundedRaw(value, options));
}
