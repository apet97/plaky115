export const REGISTRY_PACKAGE_STATES = Object.freeze({
  ABSENT: "absent",
  EXACT: "exact",
  MISMATCH: "mismatch",
  AMBIGUOUS: "ambiguous",
});

export const PUBLICATION_ACTIONS = Object.freeze({
  PUBLISH_SDK: "publish-sdk",
  PUBLISH_MCP: "publish-mcp",
  COMPLETE: "complete",
  FATAL: "fatal",
  BLOCKED: "blocked",
});

export function classifyRegistryPackage({ registry, artifact }) {
  if (!registry || registry.state === undefined) return REGISTRY_PACKAGE_STATES.AMBIGUOUS;
  if (registry.state === "absent") return REGISTRY_PACKAGE_STATES.ABSENT;
  if (registry.state !== "present" || !registry.manifest) return REGISTRY_PACKAGE_STATES.AMBIGUOUS;
  const manifest = registry.manifest;
  const exact = manifest.name === artifact.package
    && manifest.version === artifact.version
    && manifest.dist?.integrity === artifact.integrity
    && sameRecord(manifest.dependencies, artifact.dependencies)
    && sameRecord(manifest.peerDependencies, artifact.peerDependencies)
    && sameRecord(manifest.optionalDependencies, artifact.optionalDependencies);
  return exact ? REGISTRY_PACKAGE_STATES.EXACT : REGISTRY_PACKAGE_STATES.MISMATCH;
}

export function classifyPublicationState({ sdk, mcp }) {
  if (![sdk, mcp].every((state) => Object.values(REGISTRY_PACKAGE_STATES).includes(state))) {
    return { action: PUBLICATION_ACTIONS.BLOCKED, reason: "invalid-registry-state" };
  }
  if ([sdk, mcp].some((state) => state === REGISTRY_PACKAGE_STATES.AMBIGUOUS || state === REGISTRY_PACKAGE_STATES.MISMATCH)) {
    return { action: PUBLICATION_ACTIONS.BLOCKED, reason: "registry-state-not-provable" };
  }
  if (sdk === REGISTRY_PACKAGE_STATES.ABSENT && mcp === REGISTRY_PACKAGE_STATES.ABSENT) {
    return { action: PUBLICATION_ACTIONS.PUBLISH_SDK, reason: "both-absent" };
  }
  if (sdk === REGISTRY_PACKAGE_STATES.EXACT && mcp === REGISTRY_PACKAGE_STATES.ABSENT) {
    return { action: PUBLICATION_ACTIONS.PUBLISH_MCP, reason: "sdk-exact-mcp-absent" };
  }
  if (sdk === REGISTRY_PACKAGE_STATES.EXACT && mcp === REGISTRY_PACKAGE_STATES.EXACT) {
    return { action: PUBLICATION_ACTIONS.COMPLETE, reason: "both-exact" };
  }
  if (sdk === REGISTRY_PACKAGE_STATES.ABSENT && mcp === REGISTRY_PACKAGE_STATES.EXACT) {
    return { action: PUBLICATION_ACTIONS.FATAL, reason: "mcp-present-sdk-absent" };
  }
  return { action: PUBLICATION_ACTIONS.BLOCKED, reason: "unsupported-publication-state" };
}

function sameRecord(left, right) {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}
