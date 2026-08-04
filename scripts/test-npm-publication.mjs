import assert from "node:assert/strict";
import { test } from "node:test";
import {
  classifyPublicationState,
  classifyRegistryPackage,
  PUBLICATION_ACTIONS,
  REGISTRY_PACKAGE_STATES,
} from "./lib/npm-publication.mjs";

const artifact = {
  package: "plaky115",
  version: "1.0.0",
  integrity: "sha512-digest",
  dependencies: {},
  peerDependencies: {},
  optionalDependencies: {},
};

for (const [sdk, mcp, action] of [
  ["absent", "absent", PUBLICATION_ACTIONS.PUBLISH_SDK],
  ["exact", "absent", PUBLICATION_ACTIONS.PUBLISH_MCP],
  ["exact", "exact", PUBLICATION_ACTIONS.COMPLETE],
  ["absent", "exact", PUBLICATION_ACTIONS.FATAL],
  ["mismatch", "absent", PUBLICATION_ACTIONS.BLOCKED],
  ["ambiguous", "absent", PUBLICATION_ACTIONS.BLOCKED],
]) {
  test(`publication state ${sdk}/${mcp} is ${action}`, () => {
    assert.equal(classifyPublicationState({ sdk, mcp }).action, action);
  });
}

test("registry package classification binds identity, digest, and dependency metadata", () => {
  const manifest = {
    name: artifact.package,
    version: artifact.version,
    dist: { integrity: artifact.integrity },
    dependencies: {},
    peerDependencies: {},
    optionalDependencies: {},
  };
  assert.equal(classifyRegistryPackage({ registry: { state: "absent" }, artifact }), REGISTRY_PACKAGE_STATES.ABSENT);
  assert.equal(classifyRegistryPackage({ registry: { state: "present", manifest }, artifact }), REGISTRY_PACKAGE_STATES.EXACT);
  assert.equal(classifyRegistryPackage({ registry: { state: "present", manifest: { ...manifest, dist: { integrity: "sha512-other" } } }, artifact }), REGISTRY_PACKAGE_STATES.MISMATCH);
  assert.equal(classifyRegistryPackage({ registry: { state: "present", manifest: { ...manifest, dependencies: { x: "1" } } }, artifact }), REGISTRY_PACKAGE_STATES.MISMATCH);
  assert.equal(classifyRegistryPackage({ registry: { state: "unknown" }, artifact }), REGISTRY_PACKAGE_STATES.AMBIGUOUS);
});
