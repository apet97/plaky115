import { randomUUID } from "node:crypto";

export function newIdempotencyKey(prefix = "idmp"): string {
  return `${prefix}_${randomUUID()}`;
}
