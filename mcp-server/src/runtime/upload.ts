import {
  decodeBase64Upload as decodeBase64,
  estimateBase64DecodedBytes as estimateDecodedBytes,
  normalizeUploadMetadata,
  validateUploadLimit,
  type NormalizedUpload,
  type UploadInput,
} from "plaky115";
export { UploadValidationError } from "plaky115";

const MEBIBYTE = 1024 * 1024;
export const MAX_UPLOAD_BYTES_HARD_CEILING = 25 * MEBIBYTE;
const DEFAULT_MAX_UPLOAD_BYTES = MAX_UPLOAD_BYTES_HARD_CEILING;

export type FileUploadInput = UploadInput;
export type UploadLimitOptions = { maxBytes?: number };

export function resolveMaxUploadBytes(configured = process.env["PLAKY115_MCP_MAX_UPLOAD_BYTES"]): number {
  if (configured === undefined) return DEFAULT_MAX_UPLOAD_BYTES;
  if (!/^[1-9][0-9]*$/.test(configured)) throw new Error("PLAKY115_MCP_MAX_UPLOAD_BYTES must be a positive integer.");
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value > MAX_UPLOAD_BYTES_HARD_CEILING) {
    throw new Error(`PLAKY115_MCP_MAX_UPLOAD_BYTES must not exceed ${MAX_UPLOAD_BYTES_HARD_CEILING}.`);
  }
  return validateUploadLimit(value);
}

export function estimateBase64DecodedBytes(fileBase64: string): number {
  return estimateDecodedBytes(fileBase64);
}

export function decodeBase64Upload(fileBase64: string, options: UploadLimitOptions = {}): Uint8Array {
  return decodeBase64(fileBase64, options.maxBytes ?? resolveMaxUploadBytes());
}

export function buildFileUploadFormData(input: FileUploadInput, options: UploadLimitOptions = {}): FormData {
  const maxBytes = options.maxBytes ?? resolveMaxUploadBytes();
  const metadata = normalizeUploadMetadata(input, maxBytes);
  const bytes = decodeBase64(input.fileBase64, maxBytes);
  return formDataFromUpload(metadata.fileName, metadata.mediaType, bytes);
}

export function buildFileUploadFormDataFromNormalized(upload: NormalizedUpload): FormData {
  return formDataFromUpload(upload.fileName, upload.mediaType, upload.bytes);
}

function formDataFromUpload(fileName: string, mediaType: string, bytes: Uint8Array): FormData {
  const form = new FormData();
  form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: mediaType }), fileName);
  return form;
}
