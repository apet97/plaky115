import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { verifyWebhookSignature } from "../esm/index.js";

const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../test/fixtures/plaky-webhooks/item-created.json", import.meta.url)),
    "utf8",
  ),
);

let realNow;
beforeEach(() => {
  realNow = Date.now;
  Date.now = () => Number(fixture.timestamp) * 1000 + 1000;
});
afterEach(() => {
  Date.now = realNow;
});

test("verifyWebhookSignature accepts a valid fixture", () => {
  assert.equal(
    verifyWebhookSignature(fixture.payload, fixture.signature, fixture.timestamp, { secret: fixture.secret }),
    true,
  );
});

test("rejects tampered body", () => {
  assert.equal(
    verifyWebhookSignature(fixture.payload + "X", fixture.signature, fixture.timestamp, { secret: fixture.secret }),
    false,
  );
});

test("rejects outside tolerance window", () => {
  Date.now = realNow;
  assert.equal(
    verifyWebhookSignature(fixture.payload, fixture.signature, fixture.timestamp, {
      secret: fixture.secret,
      toleranceSeconds: 0,
    }),
    false,
  );
});

test("rejects wrong secret", () => {
  assert.equal(
    verifyWebhookSignature(fixture.payload, fixture.signature, fixture.timestamp, { secret: "wrong" }),
    false,
  );
});
