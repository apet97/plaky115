import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const METADATA_PATH = "openapi/plaky115-operation-metadata.json";

export async function buildSurfaceReport(rootURL) {
  const root = fileURLToPath(rootURL);
  const metadata = readJSON(join(root, METADATA_PATH));
  const spec = buildSpec(metadata);
  const sdk = buildSdkReport(root, spec);
  const cli = buildCliReport(root, spec);
  const mcp = buildMcpReport(root, spec);
  return { spec, sdk, cli, mcp };
}

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function buildSpec(metadata) {
  const ops = metadata.operations ?? [];
  return {
    operationCount: ops.length,
    operationIds: ops.map((o) => o.operationId),
    operationDetails: ops.map((op) => ({
      operationId: op.operationId,
      method: op.method,
      path: op.path,
      mcpName: op.mcpName,
      scopes: op.scopes ?? [],
      readOnly: op.readOnly === true,
      destructive: op.destructive === true,
      list: op.list === true,
      mutation: op.mutation === true,
      pagination: op.pagination ?? null,
      pathParams: extractPathParams(op.path),
      hasRequestBody: op.mutation === true && op.method !== "DELETE",
    })),
  };
}

function extractPathParams(path) {
  return [...(path ?? "").matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

function buildSdkReport(root, spec) {
  const generatedTypesPath = join(root, "sdk/src/generated/types.ts");
  const generatedOpsDir = join(root, "sdk/src/generated/operations");
  const handcraftedClientDir = join(root, "sdk/src/client");
  const esmDir = join(root, "sdk/esm");
  const legacySrcSdk = join(root, "sdk/src/sdk");
  const legacySrcFuncs = join(root, "sdk/src/funcs");

  const generatedTypes = existsSync(generatedTypesPath)
    ? { status: "fresh", path: relative(root, generatedTypesPath) }
    : { status: "missing", path: relative(root, generatedTypesPath) };

  const handcraftedClient = (() => {
    if (!existsSync(handcraftedClientDir)) {
      return { status: "missing" };
    }
    const required = ["client.ts", "spaces.ts", "boards.ts", "items.ts", "item-comments.ts", "reactions.ts", "users.ts", "teams.ts"];
    const present = readdirSync(handcraftedClientDir);
    const missing = required.filter((r) => !present.includes(r));
    return missing.length === 0 ? { status: "fresh" } : { status: "incomplete", missing };
  })();

  const build = (() => {
    if (!existsSync(esmDir)) {
      return { status: "missing", staleFiles: [] };
    }
    const esmFuncs = join(esmDir, "funcs");
    const expected = spec.operationIds.map(kebab);
    let stale = [];
    if (existsSync(esmFuncs)) {
      stale = readdirSync(esmFuncs)
        .filter((f) => f.endsWith(".js"))
        .map((f) => f.replace(/\.js$/, ""))
        .filter((slug) => !expected.includes(slug))
        .map((slug) => join("sdk/esm/funcs", `${slug}.js`));
    }
    return { status: stale.length === 0 ? "fresh" : "stale", staleFiles: stale };
  })();

  return {
    generatedTypes,
    handcraftedClient,
    build,
    legacy: {
      generatedOperations: existsSync(generatedOpsDir),
      srcSdk: existsSync(legacySrcSdk),
      srcFuncs: existsSync(legacySrcFuncs),
    },
  };
}

function buildCliReport(root, spec) {
  const generatedDir = join(root, "cli/internal/cli/raw");
  const curatedFile = join(root, "cli/internal/cli/dx.go");
  const legacySDK = join(root, "cli/internal/sdk");
  const generatedCommands = existsSync(generatedDir)
    ? (() => {
        const files = readdirSync(generatedDir).filter((f) => f.endsWith(".go") && f !== "raw.go");
        const slugs = files.map((f) => f.replace(/\.go$/, ""));
        const expected = spec.operationIds.map(kebab);
        const missing = expected.filter((s) => !slugs.includes(s));
        return missing.length === 0 ? { status: "fresh", path: relative(root, generatedDir) } : { status: "stale", missing };
      })()
    : existsSync(legacySDK)
      ? { status: "legacy", path: relative(root, legacySDK) }
      : { status: "missing" };
  const curatedCommands = existsSync(curatedFile)
    ? { status: "fresh", path: relative(root, curatedFile) }
    : { status: "missing" };
  return { generatedCommands, curatedCommands };
}

function buildMcpReport(root, spec) {
  const generatedDir = join(root, "mcp-server/src/tools/raw");
  const curatedDir = join(root, "mcp-server/src/tools/curated");
  const legacyTools = join(root, "mcp-server/src/mcp-server/tools");
  const generatedTools = existsSync(generatedDir)
    ? (() => {
        const files = readdirSync(generatedDir).filter((f) => f.endsWith(".ts") && f !== "index.ts");
        const slugs = files.map((f) => f.replace(/\.ts$/, ""));
        const expected = spec.operationIds.map(kebab);
        const missing = expected.filter((s) => !slugs.includes(s));
        return missing.length === 0 ? { status: "fresh" } : { status: "stale", missing };
      })()
    : existsSync(legacyTools)
      ? { status: "legacy", path: relative(root, legacyTools) }
      : { status: "missing" };
  const curatedTools = existsSync(curatedDir)
    ? { status: "fresh", path: relative(root, curatedDir) }
    : { status: "missing" };
  const esmDir = join(root, "mcp-server/esm");
  const build = existsSync(esmDir) ? { status: "fresh" } : { status: "missing" };
  return { generatedTools, curatedTools, build };
}

function kebab(camel) {
  return camel.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}
