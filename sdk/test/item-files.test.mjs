import assert from "node:assert/strict";
import { test } from "node:test";
import { PlakyClient } from "../esm/index.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clientWith(fetch, options = {}) {
  return new PlakyClient({
    apiKey: "plk_test",
    serverURL: "https://example.test/proxy/plaky",
    fetch,
    ...options,
  });
}

test("itemFiles.upload sends exactly one named FormData part and returns the 201 file", async () => {
  let request;
  const client = clientWith(async (_url, init) => {
    request = { init, headers: new Headers(init.headers) };
    return json({ id: 7, name: "report.pdf", extension: "pdf", fileType: "PDF", size: 7 }, 201);
  });
  const source = new Blob(["payload"], { type: "application/pdf" });

  const uploaded = await client.itemFiles.upload({
    spaceId: 1,
    boardId: 2,
    itemId: 3,
    file: source,
    fileName: "report.pdf",
    idempotencyKey: "upload-key",
  });

  assert.equal(request.init.method, "POST");
  assert.ok(request.init.body instanceof FormData);
  assert.deepEqual([...request.init.body.keys()], ["file"]);
  const [part] = request.init.body.getAll("file");
  assert.ok(part instanceof Blob);
  assert.equal(part.name, "report.pdf");
  assert.equal(part.type, "application/pdf");
  assert.equal(await part.text(), "payload");
  assert.equal(request.headers.get("content-type"), null);
  assert.equal(request.headers.get("idempotency-key"), "upload-key");
  assert.equal(uploaded.id, 7);
});

test("itemFiles.list returns the official bare array without pagination", async () => {
  let request;
  const files = [{ id: 1, name: "one.txt" }, { id: 2, name: "two.txt" }];
  const client = clientWith(async (url, init) => {
    request = { url: new URL(url.toString()), init };
    return json(files);
  });

  const result = await client.itemFiles.list({ spaceId: 1, boardId: 2, itemId: 3 });
  assert.ok(Array.isArray(result));
  assert.deepEqual(result, files);
  assert.equal(request.init.method, "GET");
  assert.equal(request.url.pathname, "/proxy/plaky/v1/public/spaces/1/boards/2/items/3/files");
  assert.equal("data" in result, false);
});

test("itemFiles.get encodes every path identifier", async () => {
  let pathname;
  const client = clientWith(async (url) => {
    pathname = new URL(url.toString()).pathname;
    return json({ id: 4, name: "file.txt" });
  });

  const file = await client.itemFiles.get({
    spaceId: "s/1",
    boardId: "b 2",
    itemId: "i/3",
    itemFileId: "f 4",
  });
  assert.equal(pathname, "/proxy/plaky/v1/public/spaces/s%2F1/boards/b%202/items/i%2F3/files/f%204");
  assert.equal(file.id, 4);
});

test("itemFiles.getDownload returns signed metadata without following or logging the URL", async (t) => {
  let fetchCalls = 0;
  const consoleCalls = [];
  for (const method of ["log", "warn", "error"]) {
    t.mock.method(console, method, (...args) => consoleCalls.push(args));
  }
  const signedURL = "https://download.example.test/signed?secret=opaque";
  const client = clientWith(async (url, init) => {
    fetchCalls++;
    assert.equal(init.method, "GET");
    assert.match(url.toString(), /\/files\/4\/download$/);
    return json({ url: signedURL, expiresInSeconds: 120 });
  });

  const result = await client.itemFiles.getDownload({ spaceId: 1, boardId: 2, itemId: 3, itemFileId: 4 });
  assert.deepEqual(result, { url: signedURL, expiresInSeconds: 120 });
  assert.equal(fetchCalls, 1);
  assert.equal(consoleCalls.flat().includes(signedURL), false);
});

test("itemFiles.update sends JSON and forwards an explicit options idempotency key", async () => {
  let request;
  const client = clientWith(async (_url, init) => {
    request = { init, headers: new Headers(init.headers) };
    return json({ id: 4, name: "renamed.txt", description: "Current" });
  });

  const file = await client.itemFiles.update(
    { spaceId: 1, boardId: 2, itemId: 3, itemFileId: 4, body: { name: "renamed.txt", description: "Current" } },
    { idempotencyKey: "update-file-key" },
  );
  assert.equal(request.init.method, "PUT");
  assert.equal(request.headers.get("content-type"), "application/json");
  assert.equal(request.headers.get("idempotency-key"), "update-file-key");
  assert.deepEqual(JSON.parse(request.init.body), { name: "renamed.txt", description: "Current" });
  assert.equal(file.name, "renamed.txt");
});

test("itemFiles.delete is bodyless void", async () => {
  let request;
  const client = clientWith(async (_url, init) => {
    request = { init, headers: new Headers(init.headers) };
    return new Response(null, { status: 200 });
  });

  assert.equal(await client.itemFiles.delete({ spaceId: 1, boardId: 2, itemId: 3, itemFileId: 4 }), undefined);
  assert.equal(request.init.method, "DELETE");
  assert.equal(request.init.body, undefined);
  assert.equal(request.headers.get("content-type"), null);
  assert.equal(request.headers.get("idempotency-key"), null);
});

test("itemFiles mutations make one fetch on failure even with an explicit key", async () => {
  let fetchCalls = 0;
  const client = clientWith(async () => {
    fetchCalls++;
    return json({ message: "upload failed" }, 500);
  }, { maxRetries: 2 });

  await assert.rejects(
    client.itemFiles.upload({
      spaceId: 1,
      boardId: 2,
      itemId: 3,
      file: new Blob(["x"]),
      idempotencyKey: "stable-upload-key",
    }),
    /upload failed/,
  );
  assert.equal(fetchCalls, 1);
});
