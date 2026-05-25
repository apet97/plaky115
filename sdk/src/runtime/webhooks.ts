import { createHmac, timingSafeEqual } from "node:crypto";

export type WebhookVerifyOptions = {
  secret: string;
  toleranceSeconds?: number;
};

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  opts: WebhookVerifyOptions,
): boolean {
  const tolerance = opts.toleranceSeconds ?? 300;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > tolerance) return false;
  const expected = createHmac("sha256", opts.secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
