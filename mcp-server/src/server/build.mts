/// <reference types="bun-types" />
import { build } from "bun";

const packageJson = await Bun.file("./package.json").json() as { version?: unknown };
if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
  throw new Error("MCP package version is missing");
}

await build({
  entrypoints: ["./src/server/stdio.ts"],
  outdir: "./bin",
  naming: "mcp-server.js",
  target: "node",
  format: "esm",
  sourcemap: "linked",
  minify: false,
  throw: true,
  banner: "#!/usr/bin/env node",
  external: ["@modelcontextprotocol/sdk", "plaky115", "zod"],
  define: {
    PLAKY115_MCP_PACKAGE_VERSION: JSON.stringify(packageJson.version),
  },
});
