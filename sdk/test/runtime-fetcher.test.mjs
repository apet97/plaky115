import assert from "node:assert/strict";
import { test } from "node:test";
import { doFetch, getFetch } from "../esm/runtime/internal/fetcher.js";
import { PlakyAbortError, PlakyConnectionError, PlakyTimeoutError } from "../esm/runtime/errors.js";

test("getFetch uses the injected fetch before global fetch", async () => {
  let injectedCalled = false;
  const injected = async () => {
    injectedCalled = true;
    return new Response("ok");
  };
  globalThis.fetch = async () => {
    throw new Error("global fetch should not be used");
  };

  const response = await getFetch(injected)("https://example.test");
  assert.equal(await response.text(), "ok");
  assert.equal(injectedCalled, true);
});

test("doFetch wraps timeout aborts as PlakyTimeoutError", async () => {
  await assert.rejects(
    doFetch(
      async (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
      "https://example.test",
      { method: "GET" },
      1,
    ),
    (err) => err instanceof PlakyTimeoutError,
  );
});

test("doFetch wraps caller aborts as PlakyAbortError", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    doFetch(
      async (_url, init) => {
        if (init.signal.aborted) throw new DOMException("aborted", "AbortError");
        return new Response("ok");
      },
      "https://example.test",
      { method: "GET", signal: controller.signal },
      1000,
    ),
    (err) => err instanceof PlakyAbortError,
  );
});

test("doFetch wraps rejected fetches as PlakyConnectionError", async () => {
  await assert.rejects(
    doFetch(
      async () => {
        throw new Error("offline");
      },
      "https://example.test",
      { method: "GET" },
      1000,
    ),
    (err) => err instanceof PlakyConnectionError,
  );
});
