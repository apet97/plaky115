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

test("all verification and exact-artifact state-machine steps precede publication", () => {
  const runs = parseWorkflow().jobs.publish.steps.flatMap((step) => step.run ? [step.run] : []);
  const pack = runs.findIndex((run) => run.includes("scripts/pack-release-artifacts.mjs --pack"));
  const publish = runs.findIndex((run) => run.includes("scripts/publish-npm-release.mjs"));
  const evidence = runs.findIndex((run) => run.includes("--output .release-artifacts/release-evidence.json"));
  assert.ok(pack >= 0 && publish > pack && evidence > publish, "exact artifact, publication, and evidence steps must be ordered");
  assert.doesNotMatch(runs.join("\n"), /\(cd (?:sdk|mcp-server) && npm publish/);

  for (const required of [
    "npm --prefix sdk ci",
    "npm --prefix mcp-server ci",
    "cd cli && go mod download",
    "npm run verify",
    "npm run govulncheck",
    "npm run audit:production",
    "--verify --manifest .release-artifacts/release-digests.json",
    "--install --manifest .release-artifacts/release-digests.json",
    "package-consumer-smoke.mjs --artifacts-manifest .release-artifacts/release-digests.json",
    "scripts/check-release-determinism.mjs",
    "scripts/write-release-evidence.mjs --check-readback",
  ]) {
    const index = runs.findIndex((run) => run.includes(required));
    assert.ok(index >= 0 && index <= publish, `missing release command: ${required}`);
  }
});

test("workflow contains no long-lived publish token or provenance opt-out", () => {
  const source = readFileSync(workflowPath, "utf8");
  const publicationDriver = readFileSync(fileURLToPath(new URL("publish-npm-release.mjs", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /NPM_TOKEN|NODE_AUTH_TOKEN|provenance\s*[=:]\s*false|NPM_CONFIG_PROVENANCE/);
  assert.match(source, /release-digests\.json/);
  assert.match(`${source}\n${publicationDriver}`, /--provenance/);
  assert.doesNotMatch(source, /pull_request|workflow_dispatch/);
  assert.match(source, /git rev-parse "\$\{GITHUB_REF\}\^\{commit\}"/);
  assert.match(source, /test "\$\{head_commit\}" = "\$\{GITHUB_SHA\}"/);
});

function findAction(steps, repository) {
  return steps.find((step) => String(step.uses ?? "").startsWith(`${repository}@`));
}
