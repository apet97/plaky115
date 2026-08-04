import assert from "node:assert/strict";
import { test } from "node:test";

import { checkReleaseVersion, isExactSemVer } from "./check-release-version.mjs";

const sdk = pkg("plaky115");
const mcp = pkg("plaky115-mcp");

test("matching tag, package versions, and repositories pass offline", async () => {
  await assert.doesNotReject(checkReleaseVersion({ tag: "v0.2.0", sdkPackage: sdk, mcpPackage: mcp }));
});

test("tag must be a valid exact semver", async () => {
  await assert.rejects(checkReleaseVersion({ tag: "0.2.0", sdkPackage: sdk, mcpPackage: mcp }), /tag must match/);
  await assert.rejects(checkReleaseVersion({ tag: "v01.2.0", sdkPackage: sdk, mcpPackage: mcp }), /tag must match/);
  for (const version of ["1.0.0-01", "1.0.0-alpha.01", "1.0.0-alpha..1", "1.0.0-"]) {
    assert.equal(isExactSemVer(version), false, version);
  }
  for (const version of ["1.0.0-0", "1.0.0-alpha.1", "1.0.0+01", "1.0.0-alpha+build.01"]) {
    assert.equal(isExactSemVer(version), true, version);
  }
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
      return { state: "absent" };
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
    runCommand: async () => ({ state: "present" }),
  }), /already exists on npm/);
});

test("registry authentication and network ambiguity stop the release", async () => {
  await assert.rejects(checkReleaseVersion({
    tag: "v0.2.0",
    sdkPackage: sdk,
    mcpPackage: mcp,
    registryPreflight: true,
    runCommand: async () => ({ state: "ambiguous" }),
  }), /registry preflight was ambiguous/);
});

function pkg(name) {
  return {
    name,
    version: "0.2.0",
    repository: { type: "git", url: "https://github.com/apet97/plaky115" },
  };
}
