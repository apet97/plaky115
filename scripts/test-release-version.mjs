import assert from "node:assert/strict";
import { test } from "node:test";

import { checkReleaseVersion } from "./check-release-version.mjs";

const sdk = pkg("plaky115");
const mcp = pkg("plaky115-mcp");

test("matching tag, package versions, and repositories pass offline", async () => {
  await assert.doesNotReject(checkReleaseVersion({ tag: "v0.2.0", sdkPackage: sdk, mcpPackage: mcp }));
});

test("tag must be a valid exact semver", async () => {
  await assert.rejects(checkReleaseVersion({ tag: "0.2.0", sdkPackage: sdk, mcpPackage: mcp }), /tag must match/);
  await assert.rejects(checkReleaseVersion({ tag: "v01.2.0", sdkPackage: sdk, mcpPackage: mcp }), /tag must match/);
});

test("tag and both package versions must match", async () => {
  await assert.rejects(checkReleaseVersion({ tag: "v0.2.1", sdkPackage: sdk, mcpPackage: mcp }), /does not match package version/);
  await assert.rejects(checkReleaseVersion({
    tag: "v0.2.0",
    sdkPackage: sdk,
    mcpPackage: { ...mcp, version: "0.2.1" },
  }), /package versions differ/);
});

test("both repository URLs must resolve exactly to apet97/plaky115", async () => {
  await assert.rejects(checkReleaseVersion({
    tag: "v0.2.0",
    sdkPackage: { ...sdk, repository: { type: "git", url: "https://github.com/apet97/other" } },
    mcpPackage: mcp,
  }), /repository must resolve exactly to apet97\/plaky115/);
});

test("registry preflight accepts an unambiguous E404 for both exact versions", async () => {
  const calls = [];
  await checkReleaseVersion({
    tag: "v0.2.0",
    sdkPackage: sdk,
    mcpPackage: mcp,
    registryPreflight: true,
    runCommand: async (name, version) => {
      calls.push([name, version]);
      return { status: 1, stdout: "", stderr: `npm error code E404\nnpm error 404 ${name}@${version}` };
    },
  });
  assert.deepEqual(calls, [["plaky115", "0.2.0"], ["plaky115-mcp", "0.2.0"]]);
});

test("registry preflight stops when either exact version exists", async () => {
  await assert.rejects(checkReleaseVersion({
    tag: "v0.2.0",
    sdkPackage: sdk,
    mcpPackage: mcp,
    registryPreflight: true,
    runCommand: async () => ({ status: 0, stdout: '"0.2.0"\n', stderr: "" }),
  }), /already exists on npm/);
});

test("registry authentication and network ambiguity stop the release", async () => {
  await assert.rejects(checkReleaseVersion({
    tag: "v0.2.0",
    sdkPackage: sdk,
    mcpPackage: mcp,
    registryPreflight: true,
    runCommand: async () => ({ status: 1, stdout: "", stderr: "npm error code EAI_AGAIN" }),
  }), /registry preflight was ambiguous/);
});

function pkg(name) {
  return {
    name,
    version: "0.2.0",
    repository: { type: "git", url: "https://github.com/apet97/plaky115" },
  };
}
