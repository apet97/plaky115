#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function compareEsmToSrc(pkg, srcRel, esmRel, legacyRel) {
  const srcDir = join(root, pkg, srcRel);
  const esmDir = join(root, pkg, legacyRel);
  const newEsmDir = join(root, pkg, esmRel);
  const srcSlugs = existsSync(srcDir)
    ? readdirSync(srcDir).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, ""))
    : [];
  const builtSlugs = new Set();
  if (existsSync(newEsmDir)) {
    for (const f of readdirSync(newEsmDir)) {
      if (f.endsWith(".js")) builtSlugs.add(f.replace(/\.js$/, ""));
    }
  }
  const legacyBuilt = new Set();
  if (existsSync(esmDir)) {
    for (const f of readdirSync(esmDir)) {
      if (f.endsWith(".js")) legacyBuilt.add(f.replace(/\.js$/, ""));
    }
  }
  const missing = srcSlugs.filter((s) => !builtSlugs.has(s));
  const stale = [...builtSlugs].filter((s) => !srcSlugs.includes(s));
  return { pkg, srcCount: srcSlugs.length, builtCount: builtSlugs.size, legacyCount: legacyBuilt.size, missing, stale };
}

const reports = [
  compareEsmToSrc("mcp-server", "src/tools/raw", "esm/tools/raw", "esm/mcp-server"),
];
let bad = false;
const sdkGeneratedOps = join(root, "sdk", "esm", "generated", "operations");
if (existsSync(sdkGeneratedOps)) {
  console.log("sdk: generated operation artifacts present");
  bad = true;
}
const sdkPackage = JSON.parse(readFileSync(join(root, "sdk", "package.json"), "utf8"));
const privateExportPrefixes = ["./client/", "./generated/", "./runtime/internal/"];
const privateExports = Object.keys(sdkPackage.exports ?? {}).filter((key) =>
  privateExportPrefixes.some((prefix) => key.startsWith(prefix))
);
if (privateExports.length > 0) {
  console.log(`sdk: private package exports present: ${privateExports.join(", ")}`);
  bad = true;
}
// Every top-level module under sdk/src/runtime/ (not the always-private
// sdk/src/runtime/internal/, already covered by privateExportPrefixes above)
// must be a deliberate decision: either exported in the committed
// sdk/package.json, or named below as intentionally private. Without this
// check, a hand-added runtime module that nobody exported would pass
// artifact checks silently, because postgen-dx.mjs only ever rebuilds
// exports from its own hardcoded publicRuntimeModules list, never from the
// filesystem, so it can't notice a module it doesn't already know about.
const intentionallyPrivateRuntimeModules = ["mutations", "upload"];
const runtimeDir = join(root, "sdk", "src", "runtime");
const runtimeModules = existsSync(runtimeDir)
  ? readdirSync(runtimeDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts"))
      .map((entry) => entry.name.replace(/\.ts$/, ""))
  : [];
const undeclaredRuntimeModules = runtimeModules.filter((name) =>
  !sdkPackage.exports?.[`./runtime/${name}.js`] && !intentionallyPrivateRuntimeModules.includes(name)
);
if (undeclaredRuntimeModules.length > 0) {
  console.log(`sdk: undeclared runtime modules — add each to publicRuntimeModules in scripts/postgen-dx.mjs and run generate:all (public), or to intentionallyPrivateRuntimeModules in this script (private): ${undeclaredRuntimeModules.join(", ")}`);
  bad = true;
}
for (const resource of ["item-groups", "item-files"]) {
  for (const extension of ["js", "d.ts"]) {
    const artifact = join(root, "sdk", "esm", "client", `${resource}.${extension}`);
    if (!existsSync(artifact)) {
      console.log(`sdk: missing built resource artifact esm/client/${resource}.${extension}`);
      bad = true;
    }
  }
}
for (const r of reports) {
  console.log(`${r.pkg}: src=${r.srcCount} built=${r.builtCount} legacy=${r.legacyCount} missing=${r.missing.length} stale=${r.stale.length}`);
  if (r.missing.length > 0) console.log(`  missing: ${r.missing.join(", ")}`);
  if (r.stale.length > 0) console.log(`  stale  : ${r.stale.join(", ")}`);
  if (r.legacyCount > 0) console.log(`  legacy : present (run clean build to remove)`);
  if (r.missing.length > 0 || r.stale.length > 0 || r.legacyCount > 0) bad = true;
}
if (bad) process.exit(1);
