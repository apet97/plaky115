import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, PlakyAmbiguousMatchError, PlakyNotFoundError, resolveSpace, resolveBoard, resolveSpaceAndBoard, resolveItem, resolveUser, resolveTeam } from "../esm/index.js";

const SPACES = [
  { id: 1, title: "Ops" },
  { id: 2, title: "Engineering" },
  { id: 3, title: "Operations Backup" },
  { id: "9007199254740992", title: "Large exact ID" },
];

const BOARDS_BY_SPACE = {
  1: [{ id: 11, title: "Roadmap" }, { id: 12, title: "Sprint" }],
  2: [{ id: 21, title: "Bugs" }],
};

const ITEMS_BY_BOARD = {
  11: [{ id: 100, title: "Ship API wrapper" }, { id: 101, title: "Bug triage" }],
};

const USERS = [
  { id: 7, name: "Ada", email: "ada@example.com" },
  { id: 9, email: "ops@example.com" },
];

const TEAMS = [
  { id: 21, title: "Platform" },
  { id: 22, title: "Design" },
];

function json(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

let spaceListCalls = 0;
beforeEach(() => {
  spaceListCalls = 0;
  globalThis.fetch = async (url) => {
    const u = url.toString();
    const itemMatch = u.match(/\/spaces\/(\d+)\/boards\/(\d+)\/items\/(\d+)$/);
    if (itemMatch) {
      const bid = Number(itemMatch[2]);
      const item = (ITEMS_BY_BOARD[bid] ?? []).find((candidate) => String(candidate.id) === itemMatch[3]);
      return item ? json(item) : new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    }
    const itemsMatch = u.match(/\/spaces\/\d+\/boards\/(\d+)\/items/);
    if (itemsMatch) {
      const bid = Number(itemsMatch[1]);
      return json({ data: ITEMS_BY_BOARD[bid] ?? [], hasMore: false });
    }
    const boardMatch = u.match(/\/spaces\/(\d+)\/boards\/(\d+)$/);
    if (boardMatch) {
      const sid = Number(boardMatch[1]);
      const board = (BOARDS_BY_SPACE[sid] ?? []).find((candidate) => String(candidate.id) === boardMatch[2]);
      return board ? json(board) : new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    }
    const boardsMatch = u.match(/\/spaces\/(\d+)\/boards/);
    if (boardsMatch) {
      const sid = Number(boardsMatch[1]);
      return json({ data: BOARDS_BY_SPACE[sid] ?? [], hasMore: false });
    }
    const spaceMatch = u.match(/\/spaces\/([^/?]+)$/);
    if (spaceMatch) {
      const space = SPACES.find((candidate) => String(candidate.id) === spaceMatch[1]);
      return space ? json(space) : new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
    }
    if (u.endsWith("/users") || u.includes("/users?")) return json({ data: USERS, hasMore: false });
    if (u.endsWith("/teams") || u.includes("/teams?")) return json({ data: TEAMS, hasMore: false });
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      spaceListCalls++;
      return json({ data: SPACES, hasMore: false });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
});

test("resolveSpace by numeric ID hits direct match", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const s = await resolveSpace(c, 2);
  assert.equal(s.title, "Engineering");
  assert.equal(spaceListCalls, 0);
});

test("resolveSpace by name picks unique match", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const s = await resolveSpace(c, "engineering");
  assert.equal(s.id, 2);
});

test("resolveSpace throws on ambiguous name", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await assert.rejects(resolveSpace(c, "op"), (err) => err instanceof PlakyAmbiguousMatchError);
});

test("resolveSpace throws not-found", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await assert.rejects(resolveSpace(c, "missing"), (err) => err instanceof PlakyNotFoundError);
});

test("resolveBoard walks space then board", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const b = await resolveBoard(c, { space: 1, board: "Sprint" });
  assert.equal(b.id, 12);
});

test("resolveSpaceAndBoard resolves both and lists spaces only once", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const { space, board } = await resolveSpaceAndBoard(c, { space: "engineering", board: "bugs" });
  assert.equal(space.id, 2);
  assert.equal(board.id, 21);
  assert.equal(spaceListCalls, 1);
});

test("resolveItem walks space -> board -> item without re-listing spaces", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const item = await resolveItem(c, { space: 1, board: "Roadmap", item: "wrapper" });
  assert.equal(item.id, 100);
  assert.equal(spaceListCalls, 0);
});

test("resolveItem by numeric id resolves directly", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const item = await resolveItem(c, { space: 1, board: 11, item: 101 });
  assert.equal(item.title, "Bug triage");
});

test("resolveUser matches by email when the user has no name", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const u = await resolveUser(c, "ops@example");
  assert.equal(u.id, 9);
});

test("resolveTeam matches by title needle", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  const t = await resolveTeam(c, "design");
  assert.equal(t.id, 22);
});

test("resolveSpace by unknown numeric id throws not-found with the id in the message", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await assert.rejects(
    resolveSpace(c, 999),
    (err) => err instanceof PlakyNotFoundError && /id=999/.test(err.message),
  );
});

test("resolver preserves above-safe-integer decimal IDs and rejects unsafe numbers", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  assert.equal((await resolveSpace(c, "9007199254740992")).title, "Large exact ID");
  spaceListCalls = 0;
  await assert.rejects(resolveSpace(c, 9007199254740992), /decimal strings/);
  assert.equal(spaceListCalls, 0);
});

test("resolvers forward cancellation to collection and direct lookups", async () => {
  const controller = new AbortController();
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  c.spaces.listAll = async (_params, options) => {
    assert.equal(options?.signal, controller.signal);
    return [{ id: 1, title: "Ops" }];
  };
  c.boards.listAll = async (_params, options) => {
    assert.equal(options?.signal, controller.signal);
    return [{ id: 11, title: "Roadmap" }];
  };
  c.spaces.get = async (id, options) => {
    assert.equal(id, "1");
    assert.equal(options?.signal, controller.signal);
    return { id: 1, title: "Ops" };
  };

  const byTitle = await resolveSpaceAndBoard(c, { space: "ops", board: "roadmap" }, { signal: controller.signal });
  assert.equal(byTitle.board.id, 11);
  const byId = await resolveSpace(c, 1, { signal: controller.signal });
  assert.equal(byId.id, 1);
});

test("resolver rejects non-canonical and out-of-range decimal IDs", async () => {
  const c = new PlakyClient({ apiKey: "test-api-key", serverURL: "https://x" });
  await assert.rejects(resolveSpace(c, "01"), /canonical/);
  await assert.rejects(resolveSpace(c, "9223372036854775808"), /int64/);
});
