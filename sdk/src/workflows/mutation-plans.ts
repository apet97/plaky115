import { idPathSegment } from "../client/path.js";
import {
  MAX_UPLOAD_BYTES_HARD_CEILING,
  normalizeUpload,
  type NormalizedUpload,
  validateBlobUpload,
  validateUploadFileName,
  type UploadInput,
} from "../runtime/upload.js";

export type NormalizedMutationPlan = Readonly<{
  version: 1;
  operationId: string;
  targetIds: Readonly<Record<string, string>>;
  body: Readonly<Record<string, unknown>>;
  writeCount: number;
  requiresLiveResolution: boolean;
  upload?: Readonly<{
    fileName: string;
    mediaType: string;
    decodedBytes: number;
    sha256: string;
  }>;
}>;

export function normalizeItemCreatePlan(input: {
  spaceId: string | number;
  boardId: string | number;
  body: unknown;
}): NormalizedMutationPlan {
  const source = plainBody(input.body, "body");
  const body: Record<string, unknown> = { ...source };
  const groupId = body["groupId"];
  const groupTitle = body["groupTitle"];
  if (groupId !== undefined && groupTitle !== undefined) throw conflict("body.groupId", "body.groupTitle");
  if (groupId !== undefined) body["groupId"] = canonicalIdValue(groupId, "body.groupId");
  if (body["parentId"] !== undefined) body["parentId"] = canonicalIdValue(body["parentId"], "body.parentId");
  if (groupTitle !== undefined && (typeof groupTitle !== "string" || groupTitle.trim().length === 0)) {
    throw new TypeError("body.groupTitle must be a non-empty string");
  }
  return plan("createItem", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
  }, body, groupTitle !== undefined);
}

export function normalizeItemUpdateFieldsPlan(input: {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  body: unknown;
}): NormalizedMutationPlan {
  return plan("updateItemFields", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
    itemId: canonicalId(input.itemId, "itemId"),
  }, plainBody(input.body, "body"));
}

export function normalizeItemGroupCreatePlan(input: {
  spaceId: string | number;
  boardId: string | number;
  body: unknown;
}): NormalizedMutationPlan {
  const body = plainBody(input.body, "body");
  requireString(body, "title");
  requireColor(body);
  optionalString(body, "ranking");
  return plan("createItemGroup", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
  }, body);
}

export function normalizeItemGroupUpdatePlan(input: {
  spaceId: string | number;
  boardId: string | number;
  itemGroupId: string | number;
  body: unknown;
}): NormalizedMutationPlan {
  const body = plainBody(input.body, "body");
  requireString(body, "title");
  requireString(body, "ranking");
  requireColor(body);
  return plan("updateItemGroup", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
    itemGroupId: canonicalId(input.itemGroupId, "itemGroupId"),
  }, body);
}

export function normalizeCommentPlan(input: {
  operationId?: "createItemComment" | "updateItemComment";
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  itemCommentId?: string | number;
  body: unknown;
}): NormalizedMutationPlan {
  const body = plainBody(input.body, "body");
  requireString(body, "text");
  return plan(input.operationId ?? "createItemComment", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
    itemId: canonicalId(input.itemId, "itemId"),
    ...(input.itemCommentId === undefined ? {} : { itemCommentId: canonicalId(input.itemCommentId, "itemCommentId") }),
  }, body);
}

export function normalizeItemFileUpdatePlan(input: {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  itemFileId: string | number;
  body: unknown;
}): NormalizedMutationPlan {
  const body = plainBody(input.body, "body");
  validateUploadFileName(body["name"]);
  return plan("updateItemFile", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
    itemId: canonicalId(input.itemId, "itemId"),
    itemFileId: canonicalId(input.itemFileId, "itemFileId"),
  }, body);
}

export async function normalizeBlobUploadPlan(input: {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  file: Blob;
  fileName?: string | undefined;
  contentType?: string | undefined;
}): Promise<NormalizedMutationPlan> {
  const metadata = validateBlobUpload(input.file, input.fileName, input.contentType);
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return plan("uploadItemFile", {
    spaceId: canonicalId(input.spaceId, "spaceId"),
    boardId: canonicalId(input.boardId, "boardId"),
    itemId: canonicalId(input.itemId, "itemId"),
  }, {}, false, { ...metadata, sha256 });
}

export async function normalizeBase64UploadPlan(input: {
  spaceId: string | number;
  boardId: string | number;
  itemId: string | number;
  upload: UploadInput;
  maxBytes?: number | undefined;
}): Promise<NormalizedUploadPlan> {
  const upload = await normalizeUpload(input.upload, input.maxBytes ?? MAX_UPLOAD_BYTES_HARD_CEILING);
  return {
    plan: plan("uploadItemFile", {
      spaceId: canonicalId(input.spaceId, "spaceId"),
      boardId: canonicalId(input.boardId, "boardId"),
      itemId: canonicalId(input.itemId, "itemId"),
    }, {}, false, upload),
    upload,
  };
}

export type NormalizedUploadPlan = Readonly<{
  plan: NormalizedMutationPlan;
  upload: NormalizedUpload;
}>;

function plan(
  operationId: string,
  targetIds: Record<string, string>,
  body: Record<string, unknown>,
  requiresLiveResolution = false,
  upload?: Pick<NormalizedUpload, "fileName" | "mediaType" | "decodedBytes" | "sha256">,
): NormalizedMutationPlan {
  return Object.freeze({
    version: 1 as const,
    operationId,
    targetIds: Object.freeze({ ...targetIds }),
    body: Object.freeze({ ...body }),
    writeCount: 1,
    requiresLiveResolution,
    ...(upload === undefined ? {} : {
      upload: Object.freeze({
        fileName: upload.fileName,
        mediaType: upload.mediaType,
        decodedBytes: upload.decodedBytes,
        sha256: upload.sha256,
      }),
    }),
  });
}

function canonicalId(value: string | number, label: string): string {
  try {
    return idPathSegment(value);
  } catch (error) {
    throw new TypeError(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function canonicalIdValue(value: unknown, label: string): string {
  if (typeof value !== "string" && typeof value !== "number") throw new TypeError(`${label} must be a number or decimal string`);
  return canonicalId(value, label);
}

function plainBody(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${path} must be a plain object`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} must be a plain object`);
  return value as Record<string, unknown>;
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`body.${key} must be a non-empty string`);
  return value;
}

function optionalString(body: Record<string, unknown>, key: string): void {
  const value = body[key];
  if (value !== undefined && (typeof value !== "string" || value.trim().length === 0)) {
    throw new TypeError(`body.${key} must be a non-empty string when provided`);
  }
}

function requireColor(body: Record<string, unknown>): string {
  const value = body["color"];
  if (typeof value !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
    throw new TypeError("body.color must be a six-digit RGB hexadecimal color");
  }
  return value;
}

function conflict(left: string, right: string): TypeError {
  return new TypeError(`${left} and ${right} cannot both be provided`);
}
