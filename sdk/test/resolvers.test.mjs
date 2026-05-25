import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { PlakyClient, PlakyAmbiguousMatchError, PlakyNotFoundError, resolveSpace, resolveBoard } from "../esm/index.js";

const SPACES = [
  { id: 1, title: "Ops" },
  { id: 2, title: "Engineering" },
  { id: 3, title: "Operations Backup" },
];

const BOARDS_BY_SPACE = {
  1: [{ id: 11, title: "Roadmap" }, { id: 12, title: "Sprint" }],
  2: [{ id: 21, title: "Bugs" }],
};

beforeEach(() => {
  globalThis.fetch = async (url) => {
    const u = url.toString();
    if (u.endsWith("/spaces") || u.includes("/spaces?")) {
      return new Response(JSON.stringify({ data: SPACES, hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
    }
    const boardsMatch = u.match(/\/spaces\/(\d+)\/boards/);
    if (boardsMatch) {
      const sid = Number(boardsMatch[1]);
      return new Response(JSON.stringify({ data: BOARDS_BY_SPACE[sid] ?? [], hasMore: false }), { status: 200, headers: { "content-type": "application/json" } });
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
