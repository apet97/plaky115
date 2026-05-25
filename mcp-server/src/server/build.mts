/// <reference types="bun-types" />
import { build } from "bun";

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
});
