import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cleanupOwnedArtifacts,
  collectPages,
  createArtifactLedger,
  createCleanupCoordinator,
  createRunMarker,
  createShutdownCoordinator,
  executeWithCleanup,
  isOwnedArtifact,
  waitForAbsent,
  preflightLiveSweep,
  serializeLiveFailure,
  serializeLiveSummary,
  trackArtifact,
  verifyDeleteOutcome,
} from "./live-workspace-sweep.mjs";

const RUN_A = "11111111-1111-4111-8111-111111111111";
const RUN_B = "22222222-2222-4222-8222-222222222222";

test("run marker and ownership predicate are exact to one UUID", () => {
  const markerA = createRunMarker(RUN_A);
  const markerB = createRunMarker(RUN_B);
  assert.equal(markerA, `smoke:plaky115:${RUN_A}:`);
  assert.equal(isOwnedArtifact({ title: `${markerA}item` }, markerA), true);
  assert.equal(isOwnedArtifact({ name: `${markerA}file.txt` }, markerA), true);
  assert.equal(isOwnedArtifact({ content: `${markerA}comment` }, markerA), true);
  assert.equal(isOwnedArtifact({ title: `${markerB}item` }, markerA), false);
  assert.equal(isOwnedArtifact({ title: "smoke:unrelated" }, markerA), false);
  assert.equal(isOwnedArtifact({ title: `prefix ${markerA}item` }, markerA), false);
});

test("collectPages drains pagination to exhaustion in order", async () => {
  const calls = [];
  const records = await collectPages(async (page) => {
    calls.push(page);
    return page === 1
      ? { data: [{ id: 1 }], hasMore: true }
      : { data: [{ id: 2 }], hasMore: false };
  });
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(records.map((entry) => entry.id), [1, 2]);
});

test("cleanup deletes known children before parents", async () => {
  const marker = createRunMarker(RUN_A);
  const ledger = createArtifactLedger(marker);
  trackArtifact(ledger, "groups", { id: "g", title: `${marker}group`, surface: "sdk", operation: "create" });
  trackArtifact(ledger, "items", { id: "i", title: `${marker}item`, surface: "api", operation: "create" });
  trackArtifact(ledger, "comments", { id: "c", itemId: "i", content: `${marker}comment`, surface: "mcp", operation: "create" });
  trackArtifact(ledger, "files", { id: "f", itemId: "i", name: `${marker}file.txt`, surface: "cli", operation: "upload" });
  const removed = [];
  const adapters = Object.fromEntries(["comments", "files", "items", "groups"].map((family) => [family, {
    list: async () => [],
    remove: async (artifact) => removed.push(`${family}:${artifact.id}`),
  }]));

  const result = await cleanupOwnedArtifacts({ ledger, adapters });

  assert.deepEqual(removed, ["comments:c", "files:f", "items:i", "groups:g"]);
  assert.deepEqual(result.leftovers, { comments: 0, files: 0, items: 0, groups: 0 });
});

test("lost-response discovery removes only this run and preserves a concurrent run", async () => {
  const markerA = createRunMarker(RUN_A);
  const markerB = createRunMarker(RUN_B);
  const ledger = createArtifactLedger(markerA);
  const items = [
    { id: "a", title: `${markerA}lost-response` },
    { id: "b", title: `${markerB}concurrent` },
  ];
  let listCalls = 0;
  const adapters = emptyAdapters();
  adapters.items = {
    list: async () => {
      listCalls++;
      return [...items];
    },
    remove: async (artifact) => items.splice(items.findIndex((item) => item.id === artifact.id), 1),
  };

  const result = await cleanupOwnedArtifacts({ ledger, adapters });

  assert.deepEqual(items, [{ id: "b", title: `${markerB}concurrent` }]);
  assert.equal(result.discovered.items, 1);
  assert.equal(listCalls, 2, "discovery and final rescan must both run");
});

test("cleanup aggregates errors, continues, and fails after final rescan", async () => {
  const marker = createRunMarker(RUN_A);
  const ledger = createArtifactLedger(marker);
  trackArtifact(ledger, "comments", { id: "c", content: `${marker}comment` });
  trackArtifact(ledger, "items", { id: "i", title: `${marker}item` });
  const removed = [];
  const adapters = emptyAdapters();
  adapters.comments = {
    list: async () => [{ id: "c", content: `${marker}comment` }],
    remove: async () => {
      removed.push("comment");
      throw new Error("comment delete failed");
    },
  };
  adapters.items = {
    list: async () => [],
    remove: async () => removed.push("item"),
  };

  await assert.rejects(
    cleanupOwnedArtifacts({ ledger, adapters }),
    (error) => error instanceof AggregateError && error.errors.length >= 2,
  );
  assert.ok(removed.includes("item"), "parent cleanup must continue after a child failure");
});

test("cleanup treats 404 as absent but fails closed on timeouts and other errors", async () => {
  const marker = createRunMarker(RUN_A);
  const absentLedger = createArtifactLedger(marker);
  trackArtifact(absentLedger, "items", { id: "404", title: `${marker}absent` });
  const absentAdapters = emptyAdapters();
  absentAdapters.items.remove = async () => {
    const error = new Error("not found");
    error.status = 404;
    throw error;
  };
  await cleanupOwnedArtifacts({ ledger: absentLedger, adapters: absentAdapters });
  assert.equal(absentLedger.items.length, 0);

  const timeoutLedger = createArtifactLedger(marker);
  trackArtifact(timeoutLedger, "items", { id: "timeout", title: `${marker}timeout` });
  const timeoutAdapters = emptyAdapters();
  timeoutAdapters.items.remove = async () => {
    const error = new Error("request timed out");
    error.name = "AbortError";
    throw error;
  };
  await assert.rejects(cleanupOwnedArtifacts({ ledger: timeoutLedger, adapters: timeoutAdapters }), AggregateError);
});

test("an ambiguous 400 delete succeeds only after exact absence verification", async () => {
  const ambiguous = new Error("ambiguous delete response");
  ambiguous.status = 400;

  await verifyDeleteOutcome(
    async () => { throw ambiguous; },
    async () => true,
  );
  await assert.rejects(
    verifyDeleteOutcome(
      async () => { throw ambiguous; },
      async () => false,
    ),
    (error) => error === ambiguous,
  );

  const timeout = new Error("request timed out");
  timeout.name = "AbortError";
  let verified = false;
  await assert.rejects(
    verifyDeleteOutcome(
      async () => { throw timeout; },
      async () => { verified = true; return true; },
    ),
    (error) => error === timeout,
  );
  assert.equal(verified, false, "non-400 failures must not be converted into success");
});

test("absence verification polls reads without retrying the mutation", async () => {
  let checks = 0;
  const absent = await waitForAbsent(
    async () => ++checks === 3,
    { attempts: 3, delayMs: 0 },
  );
  assert.equal(absent, true);
  assert.equal(checks, 3);

  checks = 0;
  assert.equal(
    await waitForAbsent(async () => { checks++; return false; }, { attempts: 2, delayMs: 0 }),
    false,
  );
  assert.equal(checks, 2);
});

test("cleanup never retries a known mutation during discovery", async () => {
  const marker = createRunMarker(RUN_A);
  const ledger = createArtifactLedger(marker);
  const group = { id: "ambiguous", title: `${marker}group` };
  trackArtifact(ledger, "groups", group);
  let removes = 0;
  const adapters = emptyAdapters();
  adapters.groups = {
    list: async () => [group],
    remove: async () => verifyDeleteOutcome(
      async () => {
        removes++;
        const error = new Error("ambiguous delete response");
        error.status = 400;
        throw error;
      },
      async () => false,
    ),
  };

  await assert.rejects(cleanupOwnedArtifacts({ ledger, adapters }), AggregateError);
  assert.equal(removes, 1, "one exact artifact must receive at most one mutation attempt");
});

test("an API timeout still settles cleanup before the run rejects", async () => {
  const events = [];
  const timeout = new Error("private API timeout response body");
  timeout.name = "AbortError";
  await assert.rejects(
    executeWithCleanup(
      async () => { events.push("operation"); throw timeout; },
      async () => { await new Promise((resolve) => setImmediate(resolve)); events.push("cleanup"); },
    ),
    (error) => error === timeout,
  );
  assert.deepEqual(events, ["operation", "cleanup"]);
});

test("fault after create-before-track is recovered across paginated discovery", async () => {
  const marker = createRunMarker(RUN_A);
  const ledger = createArtifactLedger(marker);
  const remote = [{ id: "lost", title: `${marker}created-before-track` }];
  const pages = [[], remote];
  let scan = 0;
  const adapters = emptyAdapters();
  adapters.items.list = async () => {
    scan++;
    return collectPages(async (page) => ({ data: pages[page - 1] ?? [], hasMore: page < pages.length }));
  };
  adapters.items.remove = async (artifact) => remote.splice(remote.findIndex((entry) => entry.id === artifact.id), 1);

  const result = await cleanupOwnedArtifacts({ ledger, adapters });

  assert.equal(scan, 2, "discovery and final rescan must both paginate");
  assert.equal(result.discovered.items, 1);
  assert.deepEqual(remote, []);
});

test("SIGINT and SIGTERM share one cleanup promise and never exit early", async () => {
  let release;
  let cleanupCalls = 0;
  const cleanup = createCleanupCoordinator(async () => {
    cleanupCalls++;
    await new Promise((resolve) => { release = resolve; });
  });
  const exits = [];
  const shutdown = createShutdownCoordinator({ cleanup, exit: (code) => exits.push(code) });

  const sigint = shutdown(130);
  const sigterm = shutdown(143);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cleanupCalls, 1);
  assert.deepEqual(exits, []);
  release();
  await Promise.all([sigint, sigterm]);
  assert.deepEqual(exits, [130]);
});

test("strict preflight rejects missing IDs or builds before a mutation can run", async () => {
  let mutations = 0;
  let buildChecks = 0;
  const checks = {
    sdk: () => { buildChecks++; return true; },
    cli: () => { buildChecks++; return "/tmp/plaky115"; },
    mcp: () => { buildChecks++; return "/tmp/mcp-server.js"; },
  };
  for (const [overrides, pattern] of [
    [{ apiKey: "" }, /API key/],
    [{ spaceId: "" }, /space ID/],
    [{ boardId: "" }, /board ID/],
    [{ allowArchive: false }, /ALLOW_ARCHIVE/],
  ]) {
    await assert.rejects(
      preflightLiveSweep({ apiKey: "test-api-key", spaceId: "1", boardId: "2", allowArchive: true, wantSDK: true, wantCLI: true, wantMCP: true, checks, ...overrides }),
      pattern,
    );
  }
  assert.equal(buildChecks, 0);
  assert.equal(mutations, 0);

  for (const [failedBuild, pattern] of [["sdk", /SDK build/], ["cli", /CLI build/], ["mcp", /MCP server build/]]) {
    buildChecks = 0;
    const failingChecks = {
      sdk: () => { buildChecks++; return failedBuild !== "sdk"; },
      cli: () => { buildChecks++; return failedBuild === "cli" ? false : "/tmp/plaky115"; },
      mcp: () => { buildChecks++; return failedBuild === "mcp" ? false : "/tmp/mcp-server.js"; },
    };
    await assert.rejects(
      preflightLiveSweep({ apiKey: "test-api-key", spaceId: "1", boardId: "2", allowArchive: true, wantSDK: true, wantCLI: true, wantMCP: true, checks: failingChecks })
        .then(() => { mutations++; }),
      pattern,
    );
  }
  assert.equal(mutations, 0);
});

test("machine-readable success and failure output drops all privacy sentinels", () => {
  const sentinels = [
    ["plk_", "privacySentinel"].join(""),
    "https://download.example.invalid/private?signature=sentinel",
    "person@example.invalid",
    `${createRunMarker(RUN_A)}private-title`,
    "private comment sentinel",
    "private file content sentinel",
  ];
  const detail = {
    count: 2,
    itemId: 44,
    urlPresent: true,
    email: sentinels[2],
    title: sentinels[3],
    comment: sentinels[4],
    body: sentinels[5],
    url: sentinels[1],
    key: sentinels[0],
  };
  const success = serializeLiveSummary([{ area: "api", name: "privacy", detail }], 0);
  const failure = serializeLiveFailure(new Error(sentinels.join(" ")));
  for (const output of [success, failure]) {
    assert.doesNotThrow(() => JSON.parse(output));
    for (const sentinel of sentinels) assert.equal(output.includes(sentinel), false);
  }
  assert.deepEqual(JSON.parse(success), {
    status: "ok",
    operations: [{ surface: "api", operation: "privacy", status: "ok", count: 2, itemId: 44, urlPresent: true }],
    trackedArtifactCount: 0,
  });
});

function emptyAdapters() {
  return Object.fromEntries(["comments", "files", "items", "groups"].map((family) => [family, {
    list: async () => [],
    remove: async () => {},
  }]));
}
