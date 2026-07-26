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

test("itemGroups.list sends the paged query and preserves the response envelope", async () => {
  let request;
  const client = clientWith(async (url, init) => {
    request = { url: new URL(url.toString()), init };
    return json({ data: [{ id: 9, title: "Backlog" }], hasMore: false, page: 2, pageSize: 25 });
  });

  const page = await client.itemGroups.list({
    spaceId: "space/id",
    boardId: "board id",
    page: 2,
    pageSize: 25,
  });

  assert.equal(request.init.method, "GET");
  assert.equal(request.url.pathname, "/proxy/plaky/v1/public/spaces/space%2Fid/boards/board%20id/item-groups");
  assert.equal(request.url.searchParams.get("page"), "2");
  assert.equal(request.url.searchParams.get("pageSize"), "25");
  assert.equal(page.data[0].title, "Backlog");
  assert.equal(page.page, 2);
});

test("itemGroups.iterate and listAll walk paged group responses", async () => {
  const fetch = async (url) => {
    const page = Number(new URL(url.toString()).searchParams.get("page"));
    return page === 1
      ? json({ data: [{ id: 1, title: "One" }], hasMore: true })
      : json({ data: [{ id: 2, title: "Two" }], hasMore: false });
  };

  const client = clientWith(fetch);
  assert.deepEqual((await client.itemGroups.iterate({ spaceId: 1, boardId: 2, pageSize: 1 }).toArray()).map((g) => g.id), [1, 2]);
  assert.deepEqual((await client.itemGroups.listAll({ spaceId: 1, boardId: 2, pageSize: 1 })).map((g) => g.id), [1, 2]);
});

test("itemGroups.get encodes every path identifier", async () => {
  let pathname;
  const client = clientWith(async (url) => {
    pathname = new URL(url.toString()).pathname;
    return json({ id: 3, title: "Group" });
  });

  const group = await client.itemGroups.get({ spaceId: "s/1", boardId: "b 2", itemGroupId: "g/3" });
  assert.equal(pathname, "/proxy/plaky/v1/public/spaces/s%2F1/boards/b%202/item-groups/g%2F3");
  assert.equal(group.id, 3);
});

test("itemGroups.create sends JSON, returns the 201 object, and forwards an explicit idempotency key", async () => {
  let request;
  const client = clientWith(async (url, init) => {
    request = { url: url.toString(), init, headers: new Headers(init.headers) };
    return json({ id: 4, title: "Doing", color: "#123456", ranking: "m" }, 201);
  });

  const group = await client.itemGroups.create({
    spaceId: 1,
    boardId: 2,
    body: { title: "Doing", color: "#123456", ranking: "m" },
    idempotencyKey: "create-key",
  });

  assert.equal(request.init.method, "POST");
  assert.equal(request.headers.get("content-type"), "application/json");
  assert.equal(request.headers.get("idempotency-key"), "create-key");
  assert.deepEqual(JSON.parse(request.init.body), { title: "Doing", color: "#123456", ranking: "m" });
  assert.equal(group.id, 4);
});

test("itemGroups.update sends the generated JSON shape and options idempotency key", async () => {
  let request;
  const client = clientWith(async (_url, init) => {
    request = { init, headers: new Headers(init.headers) };
    return json({ id: 4, title: "Done", ranking: "z" });
  });

  const group = await client.itemGroups.update(
    { spaceId: 1, boardId: 2, itemGroupId: 4, body: { title: "Done", ranking: "z" } },
    { idempotencyKey: "update-key" },
  );

  assert.equal(request.init.method, "PUT");
  assert.equal(request.headers.get("idempotency-key"), "update-key");
  assert.deepEqual(JSON.parse(request.init.body), { title: "Done", ranking: "z" });
  assert.equal(group.title, "Done");
});

test("itemGroups.delete is bodyless void and sends only an explicit idempotency key", async () => {
  let request;
  const client = clientWith(async (_url, init) => {
    request = { init, headers: new Headers(init.headers) };
    return new Response(null, { status: 200 });
  });

  assert.equal(await client.itemGroups.delete({ spaceId: 1, boardId: 2, itemGroupId: 3, idempotencyKey: "delete-key" }), undefined);
  assert.equal(request.init.method, "DELETE");
  assert.equal(request.init.body, undefined);
  assert.equal(request.headers.get("content-type"), null);
  assert.equal(request.headers.get("idempotency-key"), "delete-key");
});

test("itemGroups.archive sends zero body bytes and returns void", async () => {
  let request;
  const client = clientWith(async (_url, init) => {
    request = { init, headers: new Headers(init.headers) };
    return new Response(null, { status: 200 });
  });

  assert.equal(await client.itemGroups.archive({ spaceId: 1, boardId: 2, itemGroupId: 3 }), undefined);
  assert.equal(request.init.method, "PUT");
  assert.equal(request.init.body, undefined);
  assert.equal(request.headers.get("content-type"), null);
  assert.equal(request.headers.get("idempotency-key"), null);
});

test("itemGroups mutations are never retried, even with an explicit key", async () => {
  let fetchCalls = 0;
  const client = clientWith(async () => {
    fetchCalls++;
    return json({ message: "failed" }, 500);
  }, { maxRetries: 2 });

  await assert.rejects(
    client.itemGroups.create({ spaceId: 1, boardId: 2, body: { title: "One" }, idempotencyKey: "stable-key" }),
    /failed/,
  );
  assert.equal(fetchCalls, 1);
});
