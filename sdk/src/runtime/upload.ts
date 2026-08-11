import { PlakyError } from "./errors.js";

const MEBIBYTE = 1024 * 1024;
export const MAX_UPLOAD_BYTES_HARD_CEILING = 25 * MEBIBYTE;
export const MAX_UPLOAD_FILENAME_BYTES = 255;
const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

export type UploadInput = {
  fileBase64: string;
  fileName: string;
  contentType?: string | undefined;
};

export type UploadMetadata = Readonly<{
  fileName: string;
  mediaType: string;
  decodedBytes: number;
}>;

export type NormalizedUpload = UploadMetadata & Readonly<{
  bytes: Uint8Array;
  sha256: string;
}>;

export type UploadValidationCode =
  | "invalid-filename"
  | "invalid-media-type"
  | "invalid-base64"
  | "upload-too-large"
  | "invalid-limit";

/** A stable, path-addressable local upload validation failure. */
export class UploadValidationError extends PlakyError {
  readonly code: UploadValidationCode;
  readonly path: string;

  constructor(code: UploadValidationCode, path: string, message: string) {
    super(message);
    this.code = code;
    this.path = path;
  }
}

/** Validate the configured per-upload ceiling before reading or decoding data. */
export function validateUploadLimit(maxBytes: number): number {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_UPLOAD_BYTES_HARD_CEILING) {
    throw new UploadValidationError(
      "invalid-limit",
      "maxBytes",
      `maxBytes must be between 1 and ${MAX_UPLOAD_BYTES_HARD_CEILING}.`,
    );
  }
  return maxBytes;
}

/** Validate a filename and return it unchanged. Ordinary `..` is allowed. */
export function validateUploadFileName(fileName: unknown): string {
  if (typeof fileName !== "string" || fileName.length === 0) {
    throw new UploadValidationError("invalid-filename", "fileName", "fileName must be non-empty.");
  }
  if (fileName.includes("/") || fileName.includes("\\") || hasControlCharacter(fileName)) {
    throw new UploadValidationError(
      "invalid-filename",
      "fileName",
      "fileName must not contain slash or control characters.",
    );
  }
  if (new TextEncoder().encode(fileName).byteLength > MAX_UPLOAD_FILENAME_BYTES) {
    throw new UploadValidationError(
      "invalid-filename",
      "fileName",
      `fileName must not exceed ${MAX_UPLOAD_FILENAME_BYTES} UTF-8 bytes.`,
    );
  }
  return fileName;
}

/** Parse and normalize an RFC-style media type, including legal parameters. */
export function normalizeUploadMediaType(contentType: unknown): string {
  if (contentType === undefined) return DEFAULT_CONTENT_TYPE;
  if (typeof contentType !== "string" || contentType.length === 0 || hasControlCharacter(contentType)) {
    throw new UploadValidationError("invalid-media-type", "contentType", "contentType must be a valid media type.");
  }
  const segments = splitMediaType(contentType.trim());
  const head = segments.shift();
  if (head === undefined) throw invalidMediaType();
  const slash = head.indexOf("/");
  if (slash <= 0 || slash !== head.lastIndexOf("/") || !TOKEN.test(head.slice(0, slash)) || !TOKEN.test(head.slice(slash + 1))) {
    throw invalidMediaType();
  }
  const parameters: string[] = [];
  for (const segment of segments) {
    const equals = segment.indexOf("=");
    if (equals <= 0 || equals !== segment.lastIndexOf("=")) throw invalidMediaType();
    const name = segment.slice(0, equals).trim();
    const value = segment.slice(equals + 1).trim();
    if (!TOKEN.test(name) || !validParameterValue(value)) throw invalidMediaType();
    parameters.push(`${name.toLowerCase()}=${value}`);
  }
  return `${head.slice(0, slash).toLowerCase()}/${head.slice(slash + 1).toLowerCase()}${parameters.length > 0 ? `;${parameters.join(";")}` : ""}`;
}

/** Return validated upload metadata without allocating decoded bytes. */
export function normalizeUploadMetadata(input: UploadInput, maxBytes = MAX_UPLOAD_BYTES_HARD_CEILING): UploadMetadata {
  const limit = validateUploadLimit(maxBytes);
  const fileName = validateUploadFileName(input.fileName);
  const mediaType = normalizeUploadMediaType(input.contentType);
  const decodedBytes = estimateBase64DecodedBytes(input.fileBase64);
  if (decodedBytes > limit) {
    throw new UploadValidationError("upload-too-large", "fileBase64", `Decoded upload exceeds the configured limit of ${limit} bytes.`);
  }
  return Object.freeze({ fileName, mediaType, decodedBytes });
}

/** Decode one canonical base64 value after its size has been checked. */
export function decodeBase64Upload(fileBase64: unknown, maxBytes = MAX_UPLOAD_BYTES_HARD_CEILING): Uint8Array {
  const limit = validateUploadLimit(maxBytes);
  const decodedBytes = estimateBase64DecodedBytes(fileBase64);
  if (decodedBytes > limit) {
    throw new UploadValidationError("upload-too-large", "fileBase64", `Decoded upload exceeds the configured limit of ${limit} bytes.`);
  }
  let binary: string;
  try {
    binary = atob(String(fileBase64));
  } catch {
    throw invalidBase64();
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  if (encodeBase64(bytes) !== fileBase64) throw invalidBase64();
  return bytes;
}

/** Validate, decode, and hash one upload exactly once. */
export async function normalizeUpload(input: UploadInput, maxBytes = MAX_UPLOAD_BYTES_HARD_CEILING): Promise<NormalizedUpload> {
  const metadata = normalizeUploadMetadata(input, maxBytes);
  const bytes = decodeBase64Upload(input.fileBase64, maxBytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return Object.freeze({ ...metadata, bytes, sha256 });
}

/** Validate an SDK Blob upload before its request is constructed. */
export function validateBlobUpload(file: Blob, fileName: string | undefined, contentType: string | undefined): UploadMetadata {
  if (!(file instanceof Blob)) {
    throw new UploadValidationError("invalid-filename", "file", "file must be a Blob.");
  }
  const name = fileName === undefined ? "blob" : validateUploadFileName(fileName);
  const mediaType = normalizeUploadMediaType(contentType ?? (file.type || undefined));
  if (file.size > MAX_UPLOAD_BYTES_HARD_CEILING) {
    throw new UploadValidationError("upload-too-large", "file", `Decoded upload exceeds the configured limit of ${MAX_UPLOAD_BYTES_HARD_CEILING} bytes.`);
  }
  return Object.freeze({ fileName: name, mediaType, decodedBytes: file.size });
}

export function estimateBase64DecodedBytes(fileBase64: unknown): number {
  if (typeof fileBase64 !== "string" || !CANONICAL_BASE64.test(fileBase64)) throw invalidBase64();
  if (fileBase64.length === 0) return 0;
  const padding = fileBase64.endsWith("==") ? 2 : fileBase64.endsWith("=") ? 1 : 0;
  return (fileBase64.length / 4) * 3 - padding;
}

function splitMediaType(value: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const character = value[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === ";" && !quoted) {
      segments.push(value.slice(start, index));
      start = index + 1;
    }
  }
  if (quoted || escaped) throw invalidMediaType();
  segments.push(value.slice(start));
  return segments;
}

function validParameterValue(value: string): boolean {
  if (TOKEN.test(value)) return true;
  if (value.length < 2 || value[0] !== '"' || value[value.length - 1] !== '"') return false;
  for (let index = 1; index < value.length - 1; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      if (code !== 0x09) return false;
    }
    if (value[index] === '"' && value[index - 1] !== "\\") return false;
  }
  return true;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

function invalidMediaType(): UploadValidationError {
  return new UploadValidationError("invalid-media-type", "contentType", "contentType must be a valid media type.");
}

function invalidBase64(): UploadValidationError {
  return new UploadValidationError("invalid-base64", "fileBase64", "fileBase64 must be canonical base64.");
}

function encodeBase64(bytes: Uint8Array): string {
  let encoded = "";
  const chunkSize = 32_766;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    const end = Math.min(bytes.length, start + chunkSize);
    let binary = "";
    for (let index = start; index < end; index++) binary += String.fromCharCode(bytes[index]!);
    encoded += btoa(binary);
  }
  return encoded;
}
