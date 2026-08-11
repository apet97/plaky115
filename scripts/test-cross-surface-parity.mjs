// Cross-surface parity test (F7).
//
// Drives all three Plaky115 surfaces — the TypeScript SDK (in-process), the MCP
// raw tools (through the public MCP protocol), and the Go CLI raw commands
// (subprocess) — against recording transports, then asserts that every metadata operation
// the three surfaces emit the SAME HTTP method, path, and query-parameter keys
// and values (including the threaded filter params: the `emails` array as
// repeated keys and the scalar status/type/boardViewId/parentId/subitemsBehaviour
// filters), and the SAME JSON body for writes. The operation metadata is the
// single source of truth the expectations are derived from; the SDK is
// hand-written (not generated from it), so this is the test that catches the SDK
// drifting from the generated CLI/MCP surfaces — e.g. the `expand` serialization
// (F4) or dropped raw params (F8).
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));

// Fixed inputs fed identically to every surface. Sentinel IDs need no escaping
// so all three surfaces produce byte-identical concrete paths.
const ID = {
  spaceId: 1,
  boardId: 2,
  itemId: 3,
  itemCommentId: 4,
  itemFieldKey: "F1",
  itemGroupId: 5,
  itemFileId: 6,
  teamId: 7,
};
const PAGE = 1;
const PAGE_SIZE = 2;
const EXPAND_VALUES = ["space", "board"];
const EXPAND_VALUES_BY_OPERATION = {
  listSpaces: ["board"],
  getSpace: ["board"],
};
const BODIES = {
  createItem: { title: "Parity" },
  updateItemField: { value: "x" },
  updateItemFields: { "string-1": "x" },
  createItemComment: { text: "hi" },
  updateItemComment: { text: "hi2" },
  replaceCommentReactions: { reactions: [{ value: "1f44d" }] },
  createItemGroup: { title: "Parity Group", color: "#123456", ranking: "m" },
  updateItemGroup: { title: "Parity Group Updated", color: "#654321", ranking: "n" },
  updateItemFile: { name: "parity-renamed.txt", description: "Parity file" },
};

// Server-side filter params threaded onto all three surfaces. Fed identically so
// the array (`emails`, repeated keys) and scalar filters are compared end-to-end.
const FILTERS = {
  listUsers: { emails: ["ada@example.com", "ben@example.com"], status: "ACTIVE", type: "MEMBER" },
  listItems: { boardViewId: 5, parentId: 9, subitemsBehaviour: "INCLUDE" },
};

// SDK invocation per operationId. The SDK method names do not map mechanically
// from operationIds, so this table is the explicit hand-written SDK contract.
const sdkInvokers = {
  listSpaces: (c) => c.spaces.list({ page: PAGE, pageSize: PAGE_SIZE, expand: ["board"] }),
  listTeams: (c) => c.teams.list({ page: PAGE, pageSize: PAGE_SIZE }),
  listUsers: (c) => c.users.list({ page: PAGE, pageSize: PAGE_SIZE, emails: ["ada@example.com", "ben@example.com"], status: "ACTIVE", type: "MEMBER" }),
  listBoards: (c) => c.boards.list({ spaceId: ID.spaceId, page: PAGE, pageSize: PAGE_SIZE }),
  listItems: (c) => c.items.list({ spaceId: ID.spaceId, boardId: ID.boardId, page: PAGE, pageSize: PAGE_SIZE, expand: ["space", "board"], boardViewId: 5, parentId: "9", subitemsBehaviour: "INCLUDE" }),
  createItem: (c) => c.items.create({ spaceId: ID.spaceId, boardId: ID.boardId, body: BODIES.createItem }),
  getSpace: (c) => c.spaces.get({ spaceId: ID.spaceId, expand: ["board"] }),
  getTeam: (c) => c.teams.get(ID.teamId),
  getCurrentUser: (c) => c.users.me(),
  getBoard: (c) => c.boards.get({ spaceId: ID.spaceId, boardId: ID.boardId }),
  listSubitems: (c) => c.items.listSubitems({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, page: PAGE, pageSize: PAGE_SIZE, expand: ["space", "board"] }),
  getItem: (c) => c.items.get({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, expand: ["space", "board"] }),
  deleteItem: (c) => c.items.delete({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId }),
  updateItemField: (c) => c.items.updateField({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemFieldKey: ID.itemFieldKey, body: BODIES.updateItemField }),
  updateItemFields: (c) => c.items.updateFields({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, body: BODIES.updateItemFields }),
  listItemComments: (c) => c.comments.list({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId }),
  createItemComment: (c) => c.comments.create({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, body: BODIES.createItemComment }),
  updateItemComment: (c) => c.comments.update({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemCommentId: ID.itemCommentId, body: BODIES.updateItemComment }),
  deleteItemComment: (c) => c.comments.delete({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemCommentId: ID.itemCommentId }),
  replaceCommentReactions: (c) => c.reactions.replace({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemCommentId: ID.itemCommentId, body: BODIES.replaceCommentReactions }),
  listItemGroups: (c) => c.itemGroups.list({ spaceId: ID.spaceId, boardId: ID.boardId, page: PAGE, pageSize: PAGE_SIZE }),
  createItemGroup: (c) => c.itemGroups.create({ spaceId: ID.spaceId, boardId: ID.boardId, body: BODIES.createItemGroup }),
  getItemGroup: (c) => c.itemGroups.get({ spaceId: ID.spaceId, boardId: ID.boardId, itemGroupId: ID.itemGroupId }),
  updateItemGroup: (c) => c.itemGroups.update({ spaceId: ID.spaceId, boardId: ID.boardId, itemGroupId: ID.itemGroupId, body: BODIES.updateItemGroup }),
  deleteItemGroup: (c) => c.itemGroups.delete({ spaceId: ID.spaceId, boardId: ID.boardId, itemGroupId: ID.itemGroupId }),
  archiveItemGroup: (c) => c.itemGroups.archive({ spaceId: ID.spaceId, boardId: ID.boardId, itemGroupId: ID.itemGroupId }),
  listItemFiles: (c) => c.itemFiles.list({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId }),
  uploadItemFile: (c) => c.itemFiles.upload({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, file: new Blob(["parity"], { type: "text/plain" }), fileName: "parity.txt" }),
  getItemFile: (c) => c.itemFiles.get({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemFileId: ID.itemFileId }),
  updateItemFile: (c) => c.itemFiles.update({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemFileId: ID.itemFileId, body: BODIES.updateItemFile }),
  deleteItemFile: (c) => c.itemFiles.delete({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemFileId: ID.itemFileId }),
  getItemFileDownload: (c) => c.itemFiles.getDownload({ spaceId: ID.spaceId, boardId: ID.boardId, itemId: ID.itemId, itemFileId: ID.itemFileId }),
};

function camelToKebab(value) {
  return value.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

// Derive the metadata-driven shape of one operation: the inputs each surface is
// expected to send and the resulting concrete request.
function describeOperation(op) {
  const parameters = op.parameters ?? [];
  const pathParameters = parameters.filter((parameter) => parameter.in === "path");
  const queryParameters = uniqueParameters([
    ...parameters.filter((parameter) => parameter.in === "query"),
    ...(op.pagination?.inputs ?? []),
  ]);
  const expectsExpand = queryParameters.some(({ name }) => name === "expand");
  const requestKind = op.request.kind;
  const successKind = op.success.kind;

  const concretePath = op.path.replace(/\{([^}]+)\}/g, (_m, name) => {
    if (!(name in ID)) throw new Error(`no sentinel for path param ${name} in ${op.operationId}`);
    return ID[name];
  });

  const expectedQueryPairs = [];
  const mcpInput = {};
  const sdkQuery = {};
  const cliCmd = camelToKebab(op.operationId);
  const cliFlags = [];
  for (const { name } of pathParameters) {
    mcpInput[name] = ID[name];
    cliFlags.push(`--${camelToKebab(name)}`, String(ID[name]));
  }
  for (const parameter of queryParameters) {
    const value = queryValue(op.operationId, parameter);
    if (value === undefined) continue;
    sdkQuery[parameter.name] = value;
    mcpInput[parameter.name] = value;
    if (Array.isArray(value)) {
      if (parameter.explode === false) {
        const joined = value.join(",");
        expectedQueryPairs.push(`${parameter.name}=${joined}`);
        cliFlags.push(`--${camelToKebab(parameter.name)}`, joined);
      } else {
        for (const entry of value) {
          expectedQueryPairs.push(`${parameter.name}=${entry}`);
          cliFlags.push(`--${camelToKebab(parameter.name)}`, String(entry));
        }
      }
    } else {
      expectedQueryPairs.push(`${parameter.name}=${value}`);
      cliFlags.push(`--${camelToKebab(parameter.name)}`, String(value));
    }
  }
  expectedQueryPairs.sort();

  const jsonBody = requestKind === "json" ? (BODIES[op.operationId] ?? { fixture: op.operationId }) : undefined;
  if (requestKind === "json") {
    mcpInput.body = jsonBody;
    cliFlags.push("--body", JSON.stringify(jsonBody));
  } else if (requestKind === "multipart") {
    mcpInput.fileBase64 = Buffer.from("parity").toString("base64");
    mcpInput.fileName = "parity.txt";
    mcpInput.contentType = "text/plain";
    cliFlags.push("--file", "__PARITY_UPLOAD__", "--filename", "parity.txt", "--content-type", "text/plain");
  }
  if (op.confirmation === "destructive") cliFlags.push("--confirm");

  return {
    operationId: op.operationId,
    mcpName: op.mcpName,
    method: op.method,
    concretePath,
    expectedQueryPairs,
    expectsExpand,
    requestKind,
    successKind,
    successStatus: op.success.status,
    createdIdPointer: op.success.createdIdPointer,
    sensitiveLink: op.success.sensitiveLink === true,
    jsonBody,
    sdkQuery,
    mcpInput,
    cliCmd,
    cliFlags,
  };
}

function uniqueParameters(parameters) {
  const seen = new Set();
  return parameters.filter(({ name }) => {
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });
}

function queryValue(operationId, parameter) {
  if (parameter.name === "page") return PAGE;
  if (parameter.name === "pageSize") return PAGE_SIZE;
  if (parameter.name === "expand") return EXPAND_VALUES_BY_OPERATION[operationId] ?? EXPAND_VALUES;
  const filtered = FILTERS[operationId]?.[parameter.name];
  if (filtered !== undefined) return filtered;
  if (parameter.schema.default !== undefined) return parameter.schema.default;
  if (Array.isArray(parameter.schema.enum) && parameter.schema.enum.length > 0) return parameter.schema.enum[0];
  switch (parameter.schema.type) {
    case "string": return "fixture";
    case "integer":
    case "number": return 1;
    case "boolean": return true;
    case "array": return [parameter.schema.items?.enum?.[0] ?? "fixture"];
    default: return undefined;
  }
}

// Parse a captured request URL (full or path-relative) into method-agnostic
// dimensions: pathname plus sorted `key=value` query pairs.
function dissect(captured) {
  const url = new URL(captured.url, "http://parity.local");
  const queryPairs = [...url.searchParams.entries()].map(([k, v]) => `${k}=${v}`).sort();
  return { method: captured.method, pathname: url.pathname, queryPairs, body: captured.body, bodyKind: captured.bodyKind };
}

// A fetch implementation that records the outgoing request and returns a benign
// stub so the surface's response handling does not throw.
function recordingFetch(store) {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    const method = (init && init.method) || (typeof input === "object" && input.method) || "GET";
    const rawBody = init && init.body;
    const { body, bodyKind } = await normalizeFetchBody(rawBody);
    store.push({ url, method, body, bodyKind });
    return responseStub(method, url);
  };
}

async function normalizeFetchBody(rawBody) {
  if (rawBody === undefined || rawBody === null || rawBody === "") return { body: undefined, bodyKind: "none" };
  if (rawBody instanceof FormData) {
    return {
      body: await normalizeMultipart(rawBody),
      bodyKind: "multipart",
    };
  }
  try {
    return { body: JSON.parse(typeof rawBody === "string" ? rawBody : String(rawBody)), bodyKind: "json" };
  } catch {
    return { body: rawBody, bodyKind: "other" };
  }
}

async function normalizeMultipart(formData) {
  const entries = [...formData.entries()];
  assert.equal(entries.length, 1, `multipart request must contain exactly one part, received ${entries.length}`);
  const [[partName, file]] = entries;
  assert.notEqual(typeof file, "string", "multipart file part must be binary");
  const bytes = Buffer.from(await file.arrayBuffer());
  return {
    partName,
    fileName: file.name,
    contentType: file.type,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function normalizeMultipartBytes(rawBytes, contentType) {
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  assert.ok(boundaryMatch, "multipart content type must include a boundary");
  const boundary = (boundaryMatch[1] ?? boundaryMatch[2]).trim();
  const opening = Buffer.from(`--${boundary}\r\n`);
  assert.equal(rawBytes.subarray(0, opening.length).equals(opening), true, "multipart body must start with its boundary");

  const headerEnd = rawBytes.indexOf(Buffer.from("\r\n\r\n"), opening.length);
  assert.notEqual(headerEnd, -1, "multipart part must terminate its headers");
  const headerText = rawBytes.subarray(opening.length, headerEnd).toString("utf8");
  const disposition = /^content-disposition:\s*form-data;([^\r\n]+)$/im.exec(headerText);
  assert.ok(disposition, "multipart part must include a form-data content disposition");
  const partNameMatch = /(?:^|;)\s*name=(?:"([^"]+)"|([^;\s]+))/i.exec(disposition[1]);
  const fileNameMatch = /(?:^|;)\s*filename=(?:"([^"]+)"|([^;\s]+))/i.exec(disposition[1]);
  const partName = partNameMatch?.[1] ?? partNameMatch?.[2];
  const fileName = fileNameMatch?.[1] ?? fileNameMatch?.[2];
  assert.ok(partName, "multipart part must include a name");
  assert.ok(fileName, "multipart file part must include a filename");
  const partContentType = /^content-type:\s*([^\r\n]+)$/im.exec(headerText)?.[1].trim() ?? "";

  const contentStart = headerEnd + 4;
  const contentEnd = rawBytes.indexOf(Buffer.from(`\r\n--${boundary}`), contentStart);
  assert.notEqual(contentEnd, -1, "multipart part must end at its boundary");
  const bytes = rawBytes.subarray(contentStart, contentEnd);
  return {
    partName,
    fileName,
    contentType: partContentType,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function responseStub(method, url) {
  const pathname = new URL(url, "http://parity.local").pathname;
  const operation = operations.find((candidate) => candidate.method === method && candidate.concretePath === pathname);
  if (!operation) throw new Error(`no parity metadata for ${method} ${pathname}`);
  const status = operation.successStatus;
  if (operation.successKind === "void") return new Response(null, { status });
  const body = JSON.stringify(responseBody(operation));
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

function responseBody(operation) {
  if (operation.successKind === "json-array") return [];
  if (operation.successKind === "paged-object") return { data: [], hasMore: false };
  if (operation.sensitiveLink) return { url: "https://download.example.test/parity", expiresInSeconds: 60 };
  if (operation.createdIdPointer === "$.id") return { id: 1 };
  return {};
}

// Always rebuild the esm before importing it: validating a stale build against
// fresh metadata would be a false green. The gated path already rebuilds; this
// also makes standalone `node --test` runs trustworthy.
function ensureBuild(prefix) {
  execFileSync("npm", ["--prefix", prefix, "run", "build"], { cwd: root, stdio: "inherit" });
}

const metadata = JSON.parse(readFileSync(join(root, "openapi/plaky115-operation-metadata.json"), "utf8"));
const operations = metadata.operations.map(describeOperation);

let sdkClient;
let mcpServer;
let mcpClient;
let savedFetch;
const sdkStore = [];
const mcpStore = [];
const cliStore = [];
let tmpDir;
let binPath;
let recorder;
let cliBase;
let uploadPath;

before(async () => {
  ensureBuild("sdk");
  ensureBuild("mcp-server");

  const sdkMod = await import(pathToFileURL(join(root, "sdk/esm/index.js")).href);
  sdkClient = new sdkMod.PlakyClient({
    apiKey: "test-api-key",
    serverURL: "http://127.0.0.1",
    maxRetries: 0,
    fetch: recordingFetch(sdkStore),
  });

  // MCP raw tools use globalThis.fetch (their client passes no explicit fetch).
  savedFetch = globalThis.fetch;
  globalThis.fetch = recordingFetch(mcpStore);
  const mcpMod = await import(pathToFileURL(join(root, "mcp-server/esm/server/index.js")).href);
  ({ server: mcpServer } = mcpMod.buildServer({
    apiKey: "test-api-key",
    serverURL: "http://127.0.0.1",
    mode: "all",
    scopes: ["read", "write", "destructive"],
  }));
  const clientMod = await import(pathToFileURL(join(root, "mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js")).href);
  const transportMod = await import(pathToFileURL(join(root, "mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/inMemory.js")).href);
  mcpClient = new clientMod.Client({ name: "plaky115-parity", version: "0.0.0" });
  const [clientTransport, serverTransport] = transportMod.InMemoryTransport.createLinkedPair();
  await Promise.all([mcpClient.connect(clientTransport), mcpServer.connect(serverTransport)]);

  tmpDir = mkdtempSync(join(tmpdir(), "plaky115-parity-"));
  uploadPath = join(tmpDir, "parity.txt");
  writeFileSync(uploadPath, "parity");
  binPath = join(tmpDir, "plaky115-parity");
  execFileSync("go", ["build", "-o", binPath, "./cmd/plaky115"], { cwd: join(root, "cli"), stdio: "inherit" });

  recorder = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const rawBytes = Buffer.concat(chunks);
        const raw = rawBytes.toString("utf8");
        const contentType = req.headers["content-type"] ?? "";
        let body;
        let bodyKind = "none";
        if (contentType.startsWith("multipart/form-data")) {
          bodyKind = "multipart";
          body = normalizeMultipartBytes(rawBytes, contentType);
        } else if (raw) {
          try {
            body = JSON.parse(raw);
            bodyKind = "json";
          } catch {
            body = raw;
            bodyKind = "other";
          }
        }
        cliStore.push({ method: req.method, url: req.url, body, bodyKind });
        const operation = operations.find((candidate) => candidate.method === req.method && candidate.concretePath === new URL(req.url, "http://parity.local").pathname);
        if (!operation) throw new Error(`no parity metadata for ${req.method} ${req.url}`);
        res.statusCode = operation.successStatus;
        if (operation.successKind === "void") {
          res.end();
        } else {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(responseBody(operation)));
        }
      } catch {
        res.statusCode = 500;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end("parity recorder failure");
      }
    });
  });
  await new Promise((resolve) => recorder.listen(0, "127.0.0.1", resolve));
  cliBase = `http://127.0.0.1:${recorder.address().port}`;
});

after(async () => {
  if (savedFetch) globalThis.fetch = savedFetch;
  if (mcpClient) await mcpClient.close();
  if (mcpServer) await mcpServer.close();
  if (recorder) await new Promise((resolve) => recorder.close(resolve));
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

async function captureSdk(op) {
  const before = sdkStore.length;
  const invoke = sdkInvokers[op.operationId];
  if (invoke) {
    await invoke(sdkClient);
  } else {
    const request = {
      method: op.method,
      path: op.concretePath,
      ...(Object.keys(op.sdkQuery).length > 0 ? { query: op.sdkQuery } : {}),
    };
    if (op.requestKind === "json") request.body = op.jsonBody;
    if (op.requestKind === "multipart") {
      const form = new FormData();
      form.append("file", new Blob(["parity"], { type: "text/plain" }), "parity.txt");
      request.body = form;
    }
    await sdkClient.request(request);
  }
  assert.equal(sdkStore.length, before + 1, `SDK ${op.operationId} should make exactly one request`);
  return dissect(sdkStore[sdkStore.length - 1]);
}

async function captureMcp(op) {
  const before = mcpStore.length;
  const response = await mcpClient.callTool({ name: op.mcpName, arguments: op.mcpInput });
  assert.notEqual(response.isError, true, `MCP ${op.mcpName} returned an error: ${JSON.stringify(response.structuredContent ?? response.content)}`);
  assert.equal(mcpStore.length, before + 1, `MCP ${op.mcpName} should make exactly one request`);
  return dissect(mcpStore[mcpStore.length - 1]);
}

async function captureCli(op) {
  const before = cliStore.length;
  const flags = op.cliFlags.map((value) => value === "__PARITY_UPLOAD__" ? uploadPath : value);
  const args = ["--api-key", "ci-stub", "--server-url", cliBase, "raw", op.cliCmd, ...flags];
  await execFileAsync(binPath, args, { env: { ...process.env, PLAKY115_API_KEY: "", PLAKY115_API_KEY_AUTH: "" } });
  assert.equal(cliStore.length, before + 1, `CLI ${op.cliCmd} should make exactly one request`);
  return dissect(cliStore[cliStore.length - 1]);
}

test("metadata operation set is unique and drives the parity matrix", () => {
  assert.equal(new Set(operations.map(({ operationId }) => operationId)).size, operations.length);
  assert.equal(operations.length, 32);
  assert.deepEqual(Object.keys(sdkInvokers).sort(), operations.map(({ operationId }) => operationId).sort());
});

for (const op of operations) {
  test(`parity: ${op.operationId}`, async () => {
    const sdk = await captureSdk(op);
    const mcp = await captureMcp(op);
    const cli = await captureCli(op);

    // Method parity.
    assert.equal(sdk.method, op.method, `SDK method for ${op.operationId}`);
    assert.equal(mcp.method, op.method, `MCP method for ${op.operationId}`);
    assert.equal(cli.method, op.method, `CLI method for ${op.operationId}`);

    // Path parity (concrete, after path-param substitution).
    assert.equal(sdk.pathname, op.concretePath, `SDK path for ${op.operationId}`);
    assert.equal(mcp.pathname, op.concretePath, `MCP path for ${op.operationId}`);
    assert.equal(cli.pathname, op.concretePath, `CLI path for ${op.operationId}`);

    // Query-key parity (and exact pairs, since inputs are identical).
    assert.deepEqual(sdk.queryPairs, op.expectedQueryPairs, `SDK query for ${op.operationId}`);
    assert.deepEqual(mcp.queryPairs, op.expectedQueryPairs, `MCP query for ${op.operationId}`);
    assert.deepEqual(cli.queryPairs, op.expectedQueryPairs, `CLI query for ${op.operationId}`);

    // Body parity follows explicit request metadata, independent of method.
    if (op.requestKind === "json") {
      const expectedBody = op.jsonBody;
      assert.deepEqual(sdk.body, expectedBody, `SDK body for ${op.operationId}`);
      assert.deepEqual(mcp.body, expectedBody, `MCP body for ${op.operationId}`);
      assert.deepEqual(cli.body, expectedBody, `CLI body for ${op.operationId}`);
      assert.equal(sdk.bodyKind, "json");
      assert.equal(mcp.bodyKind, "json");
      assert.equal(cli.bodyKind, "json");
    } else if (op.requestKind === "multipart") {
      assert.equal(sdk.bodyKind, "multipart", `SDK multipart body for ${op.operationId}`);
      assert.equal(mcp.bodyKind, "multipart", `MCP multipart body for ${op.operationId}`);
      assert.equal(cli.bodyKind, "multipart", `CLI multipart body for ${op.operationId}`);
      assert.deepEqual(sdk.body, mcp.body, `SDK/MCP multipart semantics for ${op.operationId}`);
      assert.deepEqual(sdk.body, cli.body, `SDK/CLI multipart semantics for ${op.operationId}`);
      assert.deepEqual(Object.keys(sdk.body).sort(), ["contentType", "fileName", "partName", "sha256", "size"]);
    } else {
      assert.equal(sdk.body, undefined, `SDK ${op.operationId} should send no body`);
      assert.equal(mcp.body, undefined, `MCP ${op.operationId} should send no body`);
      assert.equal(cli.body, undefined, `CLI ${op.operationId} should send no body`);
      assert.equal(sdk.bodyKind, "none");
      assert.equal(mcp.bodyKind, "none");
      assert.equal(cli.bodyKind, "none");
    }

    // F4 guard: `expand` must be one comma-joined value, never repeated keys.
    if (op.expectsExpand) {
      for (const [label, cap] of [["SDK", sdk], ["MCP", mcp], ["CLI", cli]]) {
        const expandValues = [...new URLSearchParams(cap.queryPairs.join("&")).getAll("expand")];
        assert.equal(expandValues.length, 1, `${label} ${op.operationId} should emit a single expand param`);
        assert.equal(expandValues[0], op.sdkQuery.expand.join(","), `${label} ${op.operationId} expand value`);
      }
    }

    // F1 guard: the reaction body is the spec ReactionPutRequest shape
    // (a `reactions` array of `{ value }`), identical across surfaces.
    if (op.operationId === "replaceCommentReactions") {
      for (const [label, cap] of [["SDK", sdk], ["MCP", mcp], ["CLI", cli]]) {
        assert.ok(Array.isArray(cap.body.reactions), `${label} reaction body must carry a reactions array`);
        for (const entry of cap.body.reactions) {
          assert.equal(typeof entry.value, "string", `${label} reaction entry must carry a string value`);
        }
      }
    }
  });
}
