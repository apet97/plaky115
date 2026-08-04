import { redact } from "plaky115";

const MAX_STARTUP_ERROR_BYTES = 4 * 1024;
const encoder = new TextEncoder();

/** Format startup failures without leaking secrets or terminal control bytes. */
export function formatStartupError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const safe = redact(raw);
  const out: string[] = [];
  let bytes = 0;
  for (const character of safe) {
    const codePoint = character.codePointAt(0) ?? 0;
    const encoded = codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
      ? `\\u${codePoint.toString(16).toUpperCase().padStart(4, "0")}`
      : character;
    const encodedBytes = encoder.encode(encoded).byteLength;
    if (bytes + encodedBytes > MAX_STARTUP_ERROR_BYTES) {
      if (bytes + 3 <= MAX_STARTUP_ERROR_BYTES) out.push("…");
      break;
    }
    out.push(encoded);
    bytes += encodedBytes;
  }
  return out.join("");
}
