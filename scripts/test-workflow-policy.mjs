import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const workflowDir = `${root}/.github/workflows`;
const workflowFiles = readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .sort();
const allowedActions = new Set([
  "actions/checkout",
  "actions/setup-go",
  "actions/setup-node",
  "actions/upload-artifact",
  "goreleaser/goreleaser-action",
  "oven-sh/setup-bun",
  "ruby/setup-ruby",
]);

function parseYaml(path) {
  const result = spawnSync("ruby", ["-ryaml", "-rjson", "-e", "puts JSON.generate(YAML.load_file(ARGV.fetch(0)))", path], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("every external action is an approved repository pinned to a full SHA with version comment", () => {
  assert.ok(workflowFiles.length > 0);
  for (const name of workflowFiles) {
    const lines = readFileSync(`${workflowDir}/${name}`, "utf8").split("\n");
    for (const [index, line] of lines.entries()) {
      const match = line.match(/\buses:\s*([^\s#]+)/);
      if (!match || match[1].startsWith("./")) continue;
      const action = match[1].split("@")[0];
      assert.ok(allowedActions.has(action), `${name}:${index + 1} unapproved action repository ${action}`);
      assert.match(match[1], /^[^@\s]+@[0-9a-f]{40}$/, `${name}:${index + 1} action must use a full SHA`);
      assert.match(line, /\s+# v\d+\.\d+\.\d+\s*$/, `${name}:${index + 1} action must have an exact same-line version comment`);
    }
  }
});

test("workflow permissions are least privilege and checkout never persists credentials", () => {
  for (const name of workflowFiles) {
    const path = `${workflowDir}/${name}`;
    const source = readFileSync(path, "utf8");
    const workflow = parseYaml(path);
    const trigger = workflow.on ?? workflow.true;
    assert.equal(Object.hasOwn(trigger, "pull_request_target"), false, `${name} may not use pull_request_target`);
    assert.deepEqual(workflow.permissions, expectedPermissions(name), `${name} top-level permissions drifted`);
    assert.doesNotMatch(source, /permissions:\s*write-all|persist-credentials:\s*true|\bNPM_TOKEN\b|\bNODE_AUTH_TOKEN\b/);

    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      const expectedJobPermissions = name === "release-cli.yml" && jobName === "release"
        ? { contents: "write" }
        : undefined;
      assert.deepEqual(job.permissions, expectedJobPermissions, `${name}:${jobName} job permissions drifted`);
      for (const step of job.steps ?? []) {
        if (String(step.uses ?? "").startsWith("actions/checkout@")) {
          assert.equal(step.with?.["persist-credentials"], false, `${name}:${jobName} checkout must disable persisted credentials`);
        }
      }
    }
  }
});

test("Dependabot proposes weekly GitHub Actions updates", () => {
  const config = parseYaml(`${root}/.github/dependabot.yml`);
  const update = config.updates.find((entry) => entry["package-ecosystem"] === "github-actions");
  assert.ok(update, "missing github-actions Dependabot entry");
  assert.equal(update.directory, "/");
  assert.equal(update.schedule.interval, "weekly");
});

test("offline verification runs the workflow policy before any build", () => {
  const pkg = JSON.parse(readFileSync(`${root}/package.json`, "utf8"));
  assert.equal(pkg.scripts["workflow:policy:test"], "node --test scripts/test-workflow-policy.mjs");
  assert.match(pkg.scripts["verify:offline"], /^npm run workflow:policy:test && /);
});

function expectedPermissions(name) {
  if (name === "release-npm.yml") return { contents: "read", "id-token": "write" };
  return { contents: "read" };
}
