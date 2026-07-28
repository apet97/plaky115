export function redact(value) { return String(value).replace(/plk_[A-Za-z0-9_-]+/g, "[REDACTED_PLAKY_API_KEY]"); }

function sanitize(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === "status") continue;
    if (typeof entry === "number" && Number.isFinite(entry)) out[key] = entry;
    else if (typeof entry === "boolean") out[key] = entry;
    else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const nested = sanitize(entry);
      if (Object.keys(nested).length > 0) out[key] = nested;
    }
  }
  return out;
}

export function serializeLiveSummary(entries, trackedArtifactCount) {
  return JSON.stringify({
    status: "ok",
    operations: entries.map((entry) => ({ surface: String(entry.area), operation: String(entry.name), status: "ok", ...sanitize(entry.detail) })),
    trackedArtifactCount: Number.isFinite(trackedArtifactCount) ? trackedArtifactCount : 0,
  });
}

export function serializeLiveFailure(error) {
  const output = { status: "failed" };
  const pending = [error];
  const seen = new Set();
  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (output.httpStatus === undefined && Number.isFinite(current.status)) output.httpStatus = current.status;
    const artifactId = typeof current.artifactId === "number" ? current.artifactId
      : typeof current.artifactId === "string" && /^\d+$/.test(current.artifactId) ? Number(current.artifactId) : undefined;
    if (output.artifactId === undefined && Number.isSafeInteger(artifactId)) output.artifactId = artifactId;
    if (current.cause) pending.push(current.cause);
    if (Array.isArray(current.errors)) pending.push(...current.errors);
  }
  return JSON.stringify(output);
}
