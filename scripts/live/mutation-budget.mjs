export function createRunMarker(uuid) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) throw new TypeError("run identity must be a UUID");
  return `smoke:plaky115:${uuid}:`;
}

export function createArtifactLedger(marker) {
  return { marker, groups: [], items: [], comments: [], files: [] };
}

export function createMutationAttemptLedger() {
  return Object.fromEntries(["comments", "files", "items", "groups"].map((family) => [family, new Set()]));
}

export async function attemptMutationOnce(attempted, family, id, mutate) {
  const familyAttempts = attempted[family];
  if (!(familyAttempts instanceof Set)) throw new TypeError(`unknown artifact family: ${family}`);
  const artifactId = String(id ?? "unknown");
  if (familyAttempts.has(artifactId)) throw new Error(`${family} ${artifactId} mutation was already attempted`);
  familyAttempts.add(artifactId);
  return mutate();
}

export function trackArtifact(ledger, family, artifact) {
  if (!Object.hasOwn(ledger, family) || !Array.isArray(ledger[family])) throw new TypeError(`unknown artifact family: ${family}`);
  ledger[family].push({ ...artifact });
}
