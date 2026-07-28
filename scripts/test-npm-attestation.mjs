import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyProvenance } from "./verify-npm-attestation.mjs";

const digest = "ab".repeat(64);
const base = {
  integrity: `sha512-${Buffer.from(digest, "hex").toString("base64")}`,
  packageName: "plaky115",
  version: "0.2.1",
  commit: "1".repeat(40),
  tag: "v0.2.1",
  statement: {
    predicateType: "https://slsa.dev/provenance/v1",
    subject: [{ name: "pkg:npm/plaky115@0.2.1", digest: { sha512: digest } }],
    predicate: { buildDefinition: {
      externalParameters: { workflow: { ref: "refs/tags/v0.2.1", repository: "https://github.com/apet97/plaky115", path: ".github/workflows/release-npm.yml" } },
      resolvedDependencies: [{ uri: "git+https://github.com/apet97/plaky115@refs/tags/v0.2.1", digest: { gitCommit: "1".repeat(40) } }],
    } },
  },
};

test("exact npm provenance identity and digest pass", () => {
  assert.equal(verifyProvenance(base).checks.ref, true);
});

for (const [name, mutate] of [
  ["digest", (value) => { value.statement.subject[0].digest.sha512 = "00".repeat(64); }],
  ["commit", (value) => { value.statement.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = "2".repeat(40); }],
  ["ref", (value) => { value.statement.predicate.buildDefinition.externalParameters.workflow.ref = "refs/heads/main"; }],
  ["workflow", (value) => { value.statement.predicate.buildDefinition.externalParameters.workflow.path = ".github/workflows/other.yml"; }],
  ["source", (value) => { value.statement.predicate.buildDefinition.resolvedDependencies[0].uri = "git+https://github.com/apet97/other@refs/tags/v0.2.1"; }],
]) {
  test(`mismatched ${name} fails`, () => {
    const value = structuredClone(base);
    mutate(value);
    assert.throws(() => verifyProvenance(value), new RegExp(name));
  });
}

test("short SRI digest fails before provenance comparison", () => {
  const value = structuredClone(base);
  value.integrity = `sha512-${Buffer.from("ab", "hex").toString("base64")}`;
  assert.throws(() => verifyProvenance(value), /one SHA-512 digest/);
});
