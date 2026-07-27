import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const workflowPath = fileURLToPath(new URL("../.github/workflows/release-npm.yml", import.meta.url));

function parseWorkflow() {
  const result = spawnSync("ruby", ["-ryaml", "-rjson", "-e", "puts JSON.generate(YAML.load_file(ARGV.fetch(0)))", workflowPath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("npm publishing is tag-only, GitHub-hosted, and protected by exact permissions", () => {
  const workflow = parseWorkflow();
  const trigger = workflow.on ?? workflow.true;
  assert.deepEqual(trigger, { push: { tags: ["v*"] } });
  assert.deepEqual(workflow.permissions, { contents: "read", "id-token": "write" });
  assert.equal(workflow.jobs.publish.environment, "npm-release");
  assert.match(workflow.jobs.publish["runs-on"], /^ubuntu-/);
  assert.equal(workflow.jobs.publish.steps.find((step) => step.uses === "actions/checkout@v4")?.with?.["persist-credentials"], false);
});

test("release job installs the complete toolchain and exact trusted-publishing npm floor", () => {
  const steps = parseWorkflow().jobs.publish.steps;
  assert.equal(steps.find((step) => step.uses === "actions/setup-node@v4")?.with?.["node-version"], "24");
  assert.equal(steps.find((step) => step.uses === "actions/setup-node@v4")?.with?.["registry-url"], "https://registry.npmjs.org");
  assert.ok(steps.some((step) => step.uses === "actions/setup-go@v5"));
  assert.ok(steps.some((step) => step.uses === "oven-sh/setup-bun@v2"));
  assert.ok(steps.some((step) => step.uses === "ruby/setup-ruby@v1"));
  assert.ok(steps.some((step) => step.uses === "goreleaser/goreleaser-action@v7"));
  assert.ok(steps.some((step) => step.run === "npm install --global npm@11.5.1"));
});

test("all verification and registry preflights precede SDK then MCP publication", () => {
  const runs = parseWorkflow().jobs.publish.steps.flatMap((step) => step.run ? [step.run] : []);
  const sdkPublish = runs.indexOf("(cd sdk && npm publish --access public)");
  const mcpPublish = runs.indexOf("(cd mcp-server && npm publish --access public)");
  assert.ok(sdkPublish > 0 && mcpPublish === sdkPublish + 1, "publish steps must be explicit and adjacent in SDK/MCP order");

  for (const required of [
    "npm --prefix sdk ci",
    "npm --prefix mcp-server ci",
    "cd cli && go mod download",
    "npm run verify",
    "npm --prefix sdk pack --dry-run --json",
    "npm --prefix mcp-server pack --dry-run --json",
    "npm run artifacts:audit",
    "node scripts/check-release-version.mjs --tag \"${GITHUB_REF_NAME}\" --registry-preflight",
  ]) {
    const index = runs.findIndex((run) => run.includes(required));
    assert.ok(index >= 0 && index < sdkPublish, `missing pre-publish command: ${required}`);
  }
});

test("workflow contains no long-lived publish token or provenance opt-out", () => {
  const source = readFileSync(workflowPath, "utf8");
  assert.doesNotMatch(source, /NPM_TOKEN|NODE_AUTH_TOKEN|provenance\s*[=:]\s*false|NPM_CONFIG_PROVENANCE/);
  assert.doesNotMatch(source, /pull_request|workflow_dispatch/);
});
