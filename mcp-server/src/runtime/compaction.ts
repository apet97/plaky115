import { redact } from "plaky115";
import { assertPagedResult } from "plaky115/runtime/pagination.js";
import type { CompactKind, McpRespondOptions } from "./types.js";

type Record_ = Record<string, unknown>;

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
  if (options.includeRaw === true) out["raw"] = value;
  return out;
}

export function compactBoard(value: unknown, options: McpRespondOptions = {}): Record_ {
  const board = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(board, out, "id");
  copyIfPresent(board, out, "title");
  out["fieldCount"] = readArray(board, "fields").length;
  out["groupCount"] = readArray(board, "groups").length;
  if (options.includeRaw === true) out["raw"] = value;
  return out;
}

export function compactSpace(value: unknown, options: McpRespondOptions = {}): Record_ {
  const space = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(space, out, "id");
  copyIfPresent(space, out, "title");
  out["boards"] = readArray(space, "boards").map((b) => compactBoard(b, options));
  if (options.includeRaw === true) out["raw"] = value;
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
  if (options.includeRaw === true) out["raw"] = value;
  return out;
}

export function compactItemGroup(value: unknown, options: McpRespondOptions = {}): Record_ {
  const group = asRecord(value);
  const out: Record_ = {};
  for (const key of ["id", "title", "color", "ranking"]) copyIfPresent(group, out, key);
  if (options.includeRaw === true) out["raw"] = value;
  return out;
}

export function compactItemFile(value: unknown, options: McpRespondOptions = {}): Record_ {
  const file = asRecord(value);
  const out: Record_ = {};
  for (const key of ["id", "name", "description", "size", "extension", "fileType", "uploadedBy", "createdAt"]) {
    copyIfPresent(file, out, key);
  }
  if (options.includeRaw === true) out["raw"] = value;
  return out;
}

export function compactDownloadLink(value: unknown, options: McpRespondOptions = {}): Record_ {
  const link = asRecord(value);
  const out: Record_ = {};
  copyIfPresent(link, out, "url");
  copyIfPresent(link, out, "expiresInSeconds");
  if (options.includeRaw === true) out["raw"] = value;
  return out;
}

export function compactList(value: unknown, kind: CompactKind, options: McpRespondOptions = {}): Record_ {
  const page = assertPagedResult(value, `mcp.compact.${kind}`);
  const compactItems = page.data.map((it) => compactByKind(it, kind, withoutRaw(options)));
  return {
    data: compactItems,
    hasMore: page.hasMore,
    ...(options.includeRaw === true ? { raw: value } : {}),
  };
}

export function compactByKind(value: unknown, kind: CompactKind, options: McpRespondOptions = {}): unknown {
  // Some endpoints (notably listItemComments) return a bare JSON array rather
  // than a { data, hasMore } envelope. Normalize it to the same paged shape so
  // each element is compacted and the result stays a schema-valid object.
  if (Array.isArray(value)) {
    return {
      data: value.map((it) => compactByKind(it, kind, withoutRaw(options))),
      hasMore: false,
      ...(options.includeRaw === true ? { raw: value } : {}),
    };
  }
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

function withoutRaw(options: McpRespondOptions): McpRespondOptions {
  return options.includeRaw === true ? { ...options, includeRaw: false } : options;
}

export function serializeForMcp(value: unknown): string {
  return redact(JSON.stringify(value ?? null));
}

export function structuredForMcp(value: unknown): Record<string, unknown> {
  const structured = value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };
  return JSON.parse(serializeForMcp(structured)) as Record<string, unknown>;
}
