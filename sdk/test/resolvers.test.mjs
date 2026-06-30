import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, PlakyAmbiguousMatchError, PlakyNotFoundError, resolveSpace, resolveBoard, resolveSpaceAndBoard, resolveItem, resolveUser, resolveTeam } from "../esm/index.js";

const SPACES = [
  { id: 1, title: "Ops" },
  { id: 2, title: "Engineering" },
  { id: 3, title: "Operations Backup" },
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
    const itemsMatch = u.match(/\/spaces\/\d+\/boards\/(\d+)\/items/);
    if (itemsMatch) {
      const bid = Number(itemsMatch[1]);
      return json({ data: ITEMS_BY_BOARD[bid] ?? [], hasMore: false });
    }
    const boardsMatch = u.match(/\/spaces\/(\d+)\/boards/);
    if (boardsMatch) {
      const sid = Number(boardsMatch[1]);
      return json({ data: BOARDS_BY_SPACE[sid] ?? [], hasMore: false });
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
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const s = await resolveSpace(c, 2);
  assert.equal(s.title, "Engineering");
});

test("resolveSpace by name picks unique match", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const s = await resolveSpace(c, "engineering");
  assert.equal(s.id, 2);
});

test("resolveSpace throws on ambiguous name", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await assert.rejects(resolveSpace(c, "op"), (err) => err instanceof PlakyAmbiguousMatchError);
});

test("resolveSpace throws not-found", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await assert.rejects(resolveSpace(c, "missing"), (err) => err instanceof PlakyNotFoundError);
});

test("resolveBoard walks space then board", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const b = await resolveBoard(c, { space: 1, board: "Sprint" });
  assert.equal(b.id, 12);
});

test("resolveSpaceAndBoard resolves both and lists spaces only once", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const { space, board } = await resolveSpaceAndBoard(c, { space: "engineering", board: "bugs" });
  assert.equal(space.id, 2);
  assert.equal(board.id, 21);
  assert.equal(spaceListCalls, 1);
});

test("resolveItem walks space -> board -> item without re-listing spaces", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const item = await resolveItem(c, { space: 1, board: "Roadmap", item: "wrapper" });
  assert.equal(item.id, 100);
  assert.equal(spaceListCalls, 1);
});

test("resolveItem by numeric id resolves directly", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const item = await resolveItem(c, { space: 1, board: 11, item: 101 });
  assert.equal(item.title, "Bug triage");
});

test("resolveUser matches by email when the user has no name", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const u = await resolveUser(c, "ops@example");
  assert.equal(u.id, 9);
});

test("resolveTeam matches by title needle", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  const t = await resolveTeam(c, "design");
  assert.equal(t.id, 22);
});

test("resolveSpace by unknown numeric id throws not-found with the id in the message", async () => {
  const c = new PlakyClient({ apiKey: "plk_t", serverURL: "https://x" });
  await assert.rejects(
    resolveSpace(c, 999),
    (err) => err instanceof PlakyNotFoundError && /id=999/.test(err.message),
  );
});
