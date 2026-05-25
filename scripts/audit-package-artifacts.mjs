#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
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
  compareEsmToSrc("sdk", "src/generated/operations", "esm/generated/operations", "esm/funcs"),
  compareEsmToSrc("mcp-server", "src/tools/raw", "esm/tools/raw", "esm/mcp-server"),
];
let bad = false;
for (const r of reports) {
  console.log(`${r.pkg}: src=${r.srcCount} built=${r.builtCount} legacy=${r.legacyCount} missing=${r.missing.length} stale=${r.stale.length}`);
  if (r.missing.length > 0) console.log(`  missing: ${r.missing.join(", ")}`);
  if (r.stale.length > 0) console.log(`  stale  : ${r.stale.join(", ")}`);
  if (r.legacyCount > 0) console.log(`  legacy : present (run clean build to remove)`);
  if (r.missing.length > 0 || r.stale.length > 0 || r.legacyCount > 0) bad = true;
}
if (bad) process.exit(1);
