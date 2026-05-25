#!/usr/bin/env node
import { buildSurfaceReport } from "./lib/surface-audit.mjs";

const args = new Set(process.argv.slice(2));
const json = args.has("--json");
const strict = args.has("--strict");

const report = await buildSurfaceReport(new URL("..", import.meta.url));

if (json) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  print(report);
}

const driftStatuses = ["stale", "missing", "incomplete"];
const surfaces = [
  ["sdk.generatedTypes", report.sdk.generatedTypes.status],
  ["sdk.generatedOperations", report.sdk.generatedOperations.status],
  ["sdk.handcraftedClient", report.sdk.handcraftedClient.status],
  ["sdk.build", report.sdk.build.status],
  ["cli.generatedCommands", report.cli.generatedCommands.status],
  ["cli.curatedCommands", report.cli.curatedCommands.status],
  ["mcp.generatedTools", report.mcp.generatedTools.status],
  ["mcp.curatedTools", report.mcp.curatedTools.status],
];
const bad = surfaces.filter(([, status]) =>
  driftStatuses.includes(status) || (strict && status === "legacy")
);
if (bad.length > 0) {
  console.error(`Surface drift detected: ${bad.map((b) => `${b[0]}=${b[1]}`).join(", ")}`);
  process.exit(1);
}

function print(report) {
  console.log(`Spec: ${report.spec.operationCount} operations`);
  console.log(`SDK types        : ${report.sdk.generatedTypes.status}`);
  console.log(`SDK operations   : ${report.sdk.generatedOperations.status}`);
  console.log(`SDK client       : ${report.sdk.handcraftedClient.status}`);
  console.log(`SDK build        : ${report.sdk.build.status} (${report.sdk.build.staleFiles.length} stale)`);
  console.log(`CLI raw cmds     : ${report.cli.generatedCommands.status}`);
  console.log(`CLI curated cmds : ${report.cli.curatedCommands.status}`);
  console.log(`MCP raw tools    : ${report.mcp.generatedTools.status}`);
  console.log(`MCP curated tools: ${report.mcp.curatedTools.status}`);
}
