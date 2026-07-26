#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "plaky115-consumer-"));

try {
  const tarDir = join(tmp, "tarballs");
  const consumer = join(tmp, "consumer");
  mkdirSync(tarDir, { recursive: true });
  mkdirSync(consumer, { recursive: true });

  const sdkTar = pack("sdk", tarDir);
  const mcpTar = pack("mcp-server", tarDir);

  writeFileSync(join(consumer, "package.json"), `${JSON.stringify({ type: "module", private: true }, null, 2)}\n`);
  run("npm", ["install", "--silent", "--prefer-offline", "--no-audit", "--no-fund", sdkTar, mcpTar], {
    cwd: consumer,
  });

  run("node", [
    "--input-type=module",
    "-e",
    [
      "import { PlakyClient, ItemFilesResource, ItemGroupsResource, FolderId, ItemFileId, ItemGroupId, SpaceId } from 'plaky115';",
      "let fetchCalls = 0;",
      "const c = new PlakyClient({ apiKey: 'test', fetch: async (_url, init) => { fetchCalls++; if (!(init.body instanceof FormData)) throw new Error('upload is not FormData'); const parts = init.body.getAll('file'); if (parts.length !== 1 || await parts[0].text() !== 'payload') throw new Error('bad upload part'); return new Response(JSON.stringify({ id: 2, name: 'x.txt' }), { status: 201, headers: { 'content-type': 'application/json' } }); } });",
      "if (typeof c.spaces.list !== 'function') throw new Error('missing spaces.list');",
      "if (!(c.itemGroups instanceof ItemGroupsResource)) throw new Error('missing ItemGroupsResource');",
      "if (!(c.itemFiles instanceof ItemFilesResource)) throw new Error('missing ItemFilesResource');",
      "if (SpaceId(1) !== 1 || ItemGroupId(2) !== 2 || ItemFileId(3) !== 3 || FolderId(4) !== 4) throw new Error('bad ID constructor');",
      "await c.itemFiles.upload({ spaceId: 1, boardId: 1, itemId: 1, file: new Blob(['payload']), fileName: 'x.txt' });",
      "if (fetchCalls !== 1) throw new Error('upload should make one injected fetch');",
    ].join(" "),
  ], { cwd: consumer });

  run("node", [
    "--input-type=module",
    "-e",
    "const sdk = await import('plaky115'); if (typeof sdk.PlakyClient !== 'function') throw new Error('missing PlakyClient'); const runtime = await import('plaky115/runtime/http.js'); if (typeof runtime.request !== 'function') throw new Error('missing runtime request');",
  ], { cwd: consumer });

  writeFileSync(
    join(consumer, "type-smoke.ts"),
    [
      "import type { PlakyOpenApiComponents, PlakyOpenApiOperations } from 'plaky115';",
      "import type { FolderIdType, FolderShape, ItemFileDownloadShape, ItemFileIdType, ItemFileShape, ItemFileUploadParams, ItemGroupCreateBody, ItemGroupIdType, ItemGroupShape } from 'plaky115';",
      "type Space = PlakyOpenApiComponents['schemas']['SpaceResponse'];",
      "const space: Space = {};",
      "type ListSpaces = PlakyOpenApiOperations['listSpaces'];",
      "const query: ListSpaces['parameters']['query'] = { expand: ['board'] };",
      "void space;",
      "void query;",
      "const groupId: ItemGroupIdType = 1 as ItemGroupIdType;",
      "const fileId: ItemFileIdType = 2 as ItemFileIdType;",
      "const folderId: FolderIdType = 3 as FolderIdType;",
      "const group: ItemGroupShape = { id: groupId };",
      "const file: ItemFileShape = { id: fileId };",
      "const folder: FolderShape = { id: folderId };",
      "const download: ItemFileDownloadShape = { url: 'https://example.test/file', expiresInSeconds: 60 };",
      "const body: ItemGroupCreateBody = { title: 'Backlog' };",
      "const upload: ItemFileUploadParams = { spaceId: 1, boardId: 2, itemId: 3, file: new Blob(['x']) };",
      "void group; void file; void folder; void download; void body; void upload;",
    ].join("\n"),
  );
  run(join(root, "sdk/node_modules/.bin/tsc"), [
    "--noEmit",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--target",
    "ES2022",
    "--strict",
    "type-smoke.ts",
  ], { cwd: consumer });

  assertImportFails(consumer, "plaky115/operations/list-spaces.js");
  assertImportFails(consumer, "plaky115/generated/operations/list-spaces.js");
  assertImportFails(consumer, "plaky115/generated/operations/upload-item-file.js");
  assertImportFails(consumer, "plaky115/client/item-files.js");
  assertImportFails(consumer, "plaky115/runtime/internal/request-builders.js");

  run("node", [
    "--input-type=module",
    "-e",
    "import { buildServer } from 'plaky115-mcp'; if (typeof buildServer !== 'function') throw new Error('missing buildServer');",
  ], { cwd: consumer });

  run("node", ["node_modules/plaky115-mcp/bin/mcp-server.js", "--help"], { cwd: consumer });
  console.log("package-consumer-smoke: OK");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

function pack(pkg, tarDir) {
  const stdout = run("npm", ["pack", "--json", "--pack-destination", tarDir], {
    cwd: join(root, pkg),
    stdout: "pipe",
  });
  const [entry] = JSON.parse(stdout);
  return join(tarDir, entry.filename);
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.stdout === "pipe" ? ["ignore", "pipe", "pipe"] : "pipe",
  });
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${cmd} ${args.join(" ")} failed`);
  }
  return result.stdout ?? "";
}

function assertImportFails(cwd, specifier) {
  const result = spawnSync("node", ["--input-type=module", "-e", `await import(${JSON.stringify(specifier)});`], {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status === 0) {
    throw new Error(`${specifier} must not be importable from the published package`);
  }
  const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  if (!/ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_MODULE_NOT_FOUND|Cannot find package/.test(output)) {
    process.stderr.write(output);
    throw new Error(`${specifier} failed for an unexpected reason`);
  }
}
