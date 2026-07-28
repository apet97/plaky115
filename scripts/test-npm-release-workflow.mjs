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
  assert.equal(findAction(workflow.jobs.publish.steps, "actions/checkout")?.with?.["persist-credentials"], false);
  assert.equal(findAction(workflow.jobs.publish.steps, "actions/checkout")?.with?.ref, "${{ github.ref }}");
});

test("release job installs the complete toolchain and exact trusted-publishing npm floor", () => {
  const steps = parseWorkflow().jobs.publish.steps;
  assert.equal(findAction(steps, "actions/setup-node")?.with?.["node-version"], "24");
  assert.equal(findAction(steps, "actions/setup-node")?.with?.["registry-url"], "https://registry.npmjs.org");
  assert.ok(findAction(steps, "actions/setup-go"));
  assert.ok(findAction(steps, "oven-sh/setup-bun"));
  assert.ok(findAction(steps, "ruby/setup-ruby"));
  assert.ok(findAction(steps, "goreleaser/goreleaser-action"));
  assert.ok(steps.some((step) => step.run === "npm install --global npm@11.16.0"));
  assert.equal(findAction(steps, "actions/setup-go")?.with?.["go-version"], "1.26.5");
  assert.equal(findAction(steps, "goreleaser/goreleaser-action")?.with?.version, "v2.15.2");
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
    "cd sdk && npm pack --dry-run --json",
    "cd mcp-server && npm pack --dry-run --json",
    "npm run audit:production",
    "npm run govulncheck",
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
  assert.match(source, /git rev-parse "\$\{GITHUB_REF\}\^\{commit\}"/);
  assert.match(source, /test "\$\{head_commit\}" = "\$\{GITHUB_SHA\}"/);
});

function findAction(steps, repository) {
  return steps.find((step) => String(step.uses ?? "").startsWith(`${repository}@`));
}
