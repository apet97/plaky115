export async function preflightLiveSweep({
  apiKey,
  spaceId,
  boardId,
  allowArchive,
  wantSDK,
  wantCLI,
  wantMCP,
  checks,
}) {
  if (typeof apiKey !== "string" || apiKey.length === 0) throw new Error("Plaky API key is required");
  if (typeof spaceId !== "string" || spaceId.length === 0) throw new Error("sacrificial space ID is required");
  if (typeof boardId !== "string" || boardId.length === 0) throw new Error("sacrificial board ID is required");
  if (!/^\d+$/.test(spaceId) || !/^\d+$/.test(boardId)) throw new Error("space ID and board ID must be numeric");
  if (!allowArchive) throw new Error("PLAKY115_SMOKE_ALLOW_ARCHIVE=1 acknowledgement is required");

  const builds = {};
  if (wantSDK || wantMCP) {
    builds.sdkBuilt = await checks.sdk();
    if (!builds.sdkBuilt) throw new Error("SDK build is missing");
  }
  if (wantCLI) {
    builds.cliBin = await checks.cli();
    if (!builds.cliBin) throw new Error("CLI build failed");
  }
  if (wantMCP) {
    builds.mcpBin = await checks.mcp();
    if (!builds.mcpBin) throw new Error("MCP server build is missing");
  }
  return builds;
}

export function createTextFixture(marker, surface) {
  if (typeof marker !== "string" || marker.length === 0) throw new TypeError("fixture marker is required");
  if (typeof surface !== "string" || surface.length === 0) throw new TypeError("fixture surface is required");
  return {
    fileName: `${marker}fixture-${surface}.txt`,
    contentType: "text/plain",
    bytes: new TextEncoder().encode(`live fixture for ${surface}`),
  };
}

export function createFixtureFormData(fixture) {
  const form = new FormData();
  form.append("file", new Blob([fixture.bytes], { type: fixture.contentType }), fixture.fileName);
  return form;
}

export function assertBareFileList(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must return a bare array`);
  return value;
}

export function assertVoidResult(value, label) {
  if (value !== undefined) throw new Error(`${label} must return a void response`);
  return value;
}

export function summarizeDownloadLink(value) {
  if (!value || typeof value !== "object" || typeof value.url !== "string" || value.url.length === 0) {
    throw new Error("Download link must contain a non-empty HTTPS URL.");
  }
  const parsedURL = new URL(value.url);
  if (parsedURL.protocol !== "https:") throw new Error("Download link must contain a non-empty HTTPS URL.");
  if (typeof value.expiresInSeconds !== "number" || !Number.isFinite(value.expiresInSeconds)) {
    throw new Error("Download link must contain a finite numeric expiry.");
  }
  return { urlPresent: true, expiresInSeconds: value.expiresInSeconds };
}

export function normalizePlakyBaseURL(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PLAKY115_BASE_URL must be an HTTPS Plaky API host without credentials, query, or fragment");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !/(^|\.)api\.plaky\.com$/.test(url.hostname)) {
    throw new Error("PLAKY115_BASE_URL must be an HTTPS Plaky API host without credentials, query, or fragment");
  }
  return url.toString().replace(/\/$/, "");
}
