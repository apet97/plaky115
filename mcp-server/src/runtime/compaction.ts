import { redact } from "plaky115";
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

export function compactList(value: unknown, kind: CompactKind, options: McpRespondOptions = {}): Record_ {
  const r = asRecord(value);
  const items = readArray(r, "data");
  const compactItems = items.map((it) => compactByKind(it, kind, options));
  return {
    data: compactItems,
    hasMore: r["hasMore"] === true,
    ...(options.includeRaw === true ? { raw: value } : {}),
  };
}

export function compactByKind(value: unknown, kind: CompactKind, options: McpRespondOptions = {}): unknown {
  // Some endpoints (notably listItemComments) return a bare JSON array rather
  // than a { data, hasMore } envelope. Normalize it to the same paged shape so
  // each element is compacted and the result stays a schema-valid object.
  if (Array.isArray(value)) {
    return {
      data: value.map((it) => compactByKind(it, kind, options)),
      hasMore: false,
      ...(options.includeRaw === true ? { raw: value } : {}),
    };
  }
  if (value !== null && typeof value === "object" && "data" in value && Array.isArray((value as Record_)["data"])) {
    return compactList(value, kind, options);
  }
  if (kind === "item") return compactItem(value, options);
  if (kind === "board") return compactBoard(value, options);
  if (kind === "space") return compactSpace(value, options);
  if (kind === "comment") return compactComment(value, options);
  return value;
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
