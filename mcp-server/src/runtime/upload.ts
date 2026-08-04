const MEBIBYTE = 1024 * 1024;
export const MAX_UPLOAD_BYTES_HARD_CEILING = 25 * MEBIBYTE;
const DEFAULT_MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES_HARD_CEILING;

const CANONICAL_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const SAFE_CONTENT_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/;

export type FileUploadInput = {
  fileBase64: string;
  fileName: string;
  contentType?: string;
};

export type UploadLimitOptions = {
  maxBytes?: number;
};

export function resolveMaxUploadBytes(configured = process.env["PLAKY115_MCP_MAX_UPLOAD_BYTES"]): number {
  if (configured === undefined) return DEFAULT_MAX_UPLOAD_BYTES;
  if (!/^[1-9][0-9]*$/.test(configured)) {
    throw new Error("PLAKY115_MCP_MAX_UPLOAD_BYTES must be a positive integer.");
  }
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value > MAX_UPLOAD_BYTES_HARD_CEILING) {
    throw new Error(
      `PLAKY115_MCP_MAX_UPLOAD_BYTES must not exceed ${MAX_UPLOAD_BYTES_HARD_CEILING}.`,
    );
  }
  return value;
}

export function estimateBase64DecodedBytes(fileBase64: string): number {
  assertCanonicalBase64(fileBase64);
  if (fileBase64.length === 0) return 0;
  const padding = fileBase64.endsWith("==") ? 2 : fileBase64.endsWith("=") ? 1 : 0;
  return (fileBase64.length / 4) * 3 - padding;
}

export function decodeBase64Upload(
  fileBase64: string,
  options: UploadLimitOptions = {},
): Uint8Array {
  const maxBytes = options.maxBytes ?? resolveMaxUploadBytes();
  assertMaxBytes(maxBytes);
  const estimatedBytes = estimateBase64DecodedBytes(fileBase64);
  if (estimatedBytes > maxBytes) {
    throw new Error(`Decoded upload exceeds the configured limit of ${maxBytes} bytes.`);
  }
  const bytes = Buffer.from(fileBase64, "base64");
  if (bytes.toString("base64") !== fileBase64) {
    throw new Error("fileBase64 must be canonical base64.");
  }
  return bytes;
}

export function buildFileUploadFormData(
  input: FileUploadInput,
  options: UploadLimitOptions = {},
): FormData {
  if (!isSafeFileName(input.fileName)) {
    throw new Error("fileName must be a non-empty value without control characters.");
  }
  const contentType = input.contentType ?? "application/octet-stream";
  if (!SAFE_CONTENT_TYPE.test(contentType)) {
    throw new Error("contentType must be a valid media type.");
  }
  const bytes = decodeBase64Upload(input.fileBase64, options);
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
  const form = new FormData();
  form.append("file", new Blob([blobBytes.buffer], { type: contentType }), input.fileName);
  return form;
}

function isSafeFileName(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) return false;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || codePoint < 0x20 || codePoint === 0x7f) return false;
  }
  return true;
}

function assertCanonicalBase64(value: string): void {
  if (typeof value !== "string" || !CANONICAL_BASE64.test(value)) {
    throw new Error("fileBase64 must be canonical base64.");
  }
}

function assertMaxBytes(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > MAX_UPLOAD_BYTES_HARD_CEILING) {
    throw new Error(`maxBytes must be between 1 and ${MAX_UPLOAD_BYTES_HARD_CEILING}.`);
  }
}
