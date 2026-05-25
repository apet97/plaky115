#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function pack(pkg) {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: join(root, pkg),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    console.error(`npm pack failed for ${pkg}: ${result.stderr}`);
    process.exit(1);
  }
  const [parsed] = JSON.parse(result.stdout);
  return parsed.files.map((f) => f.path);
}

const sdkFiles = pack("sdk");
const mcpFiles = pack("mcp-server");

function requireFile(files, path, pkg) {
  if (!files.includes(path)) {
    console.error(`${pkg}: missing ${path}`);
    process.exit(1);
  }
}
function rejectFile(files, path, pkg) {
  if (files.includes(path)) {
    console.error(`${pkg}: must not include ${path}`);
    process.exit(1);
  }
}

requireFile(sdkFiles, "package.json", "sdk");
requireFile(sdkFiles, "README.md", "sdk");
requireFile(sdkFiles, "esm/index.js", "sdk");
requireFile(sdkFiles, "esm/index.d.ts", "sdk");
requireFile(sdkFiles, "esm/client/client.js", "sdk");
rejectFile(sdkFiles, "esm/generated/operations/list-spaces.js", "sdk");
rejectFile(sdkFiles, "esm/generated/operation-table.js", "sdk");
rejectFile(sdkFiles, "src/index.ts", "sdk");
rejectFile(sdkFiles, "FUNCTIONS.md", "sdk");
rejectFile(sdkFiles, "USAGE.md", "sdk");
rejectFile(sdkFiles, "docs/models/space-response.md", "sdk");
rejectFile(sdkFiles, "examples/spacesListSpaces.example.ts", "sdk");
rejectFile(sdkFiles, "esm/funcs/spaces-get-spaces.js", "sdk");
rejectFile(sdkFiles, "esm/sdk/sdk.js", "sdk");

requireFile(mcpFiles, "package.json", "mcp-server");
requireFile(mcpFiles, "README.md", "mcp-server");
requireFile(mcpFiles, "bin/mcp-server.js", "mcp-server");
requireFile(mcpFiles, "esm/server/index.js", "mcp-server");
requireFile(mcpFiles, "esm/tools/curated/index.js", "mcp-server");
rejectFile(mcpFiles, "src/server/index.ts", "mcp-server");
rejectFile(mcpFiles, "FUNCTIONS.md", "mcp-server");
rejectFile(mcpFiles, "USAGE.md", "mcp-server");
rejectFile(mcpFiles, "docs/models/space-response.md", "mcp-server");
rejectFile(mcpFiles, "examples/spacesGetSpaces.example.ts", "mcp-server");
rejectFile(mcpFiles, "esm/mcp-server/plaky-curated-tools.js", "mcp-server");

console.log(`pack-smoke OK: sdk=${sdkFiles.length} files, mcp-server=${mcpFiles.length} files`);
