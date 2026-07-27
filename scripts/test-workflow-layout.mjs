import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const workflowPath = fileURLToPath(new URL("../.github/workflows/release-cli.yml", import.meta.url));
const nestedWorkflowPath = fileURLToPath(new URL("../cli/.github/workflows/release.yaml", import.meta.url));

function parseYaml(path) {
  const result = spawnSync("ruby", ["-ryaml", "-rjson", "-e", "puts JSON.generate(YAML.load_file(ARGV.fetch(0)))", path], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("CLI release workflow lives at the monorepo root with bounded permissions", () => {
  assert.equal(existsSync(workflowPath), true, "missing root .github/workflows/release-cli.yml");
  assert.equal(existsSync(nestedWorkflowPath), false, "nested cli workflow must be removed");

  const workflow = parseYaml(workflowPath);
  const trigger = workflow.on ?? workflow.true;
  assert.deepEqual(trigger.push.tags, ["v*"]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.deepEqual(workflow.jobs.release.permissions, { contents: "write" });
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (name !== "release") assert.notEqual(job.permissions?.contents, "write", `${name} may not write contents`);
  }
});

test("CLI release workflow resolves the nested Go module and dist directory consistently", () => {
  const workflow = parseYaml(workflowPath);
  const steps = workflow.jobs.release.steps;
  const setupGo = steps.find((step) => step.uses === "actions/setup-go@v5");
  assert.ok(setupGo, "missing actions/setup-go@v5");
  assert.equal(setupGo.with["go-version-file"], "cli/go.mod");
  assert.equal(setupGo.with["cache-dependency-path"], "cli/go.sum");

  const release = steps.find((step) => step.uses === "goreleaser/goreleaser-action@v7");
  assert.ok(release, "release must use the same GoReleaser action v7 major as CI");
  assert.equal(release.with.workdir, "cli");
  assert.equal(release.with.args, "release --clean");
  assert.match(release.with.version, /v2/);

  const upload = steps.find((step) => String(step.uses).startsWith("actions/upload-artifact@"));
  assert.ok(upload, "missing artifact upload step");
  assert.match(upload.with.path, /^cli\/dist\//m);
});

test("GoReleaser and both installers target the monorepo with matching archive names", () => {
  const config = readFileSync(`${root}/cli/.goreleaser.yaml`, "utf8");
  const shell = readFileSync(`${root}/cli/scripts/install.sh`, "utf8");
  const powershell = readFileSync(`${root}/cli/scripts/install.ps1`, "utf8");
  const releaseDocs = readFileSync(`${root}/docs/release-checklist.md`, "utf8");
  const cliReadme = readFileSync(`${root}/cli/README.md`, "utf8");
  const combined = [config, shell, powershell, releaseDocs, cliReadme].join("\n");

  assert.doesNotMatch(combined, /apet97\/plaky115-cli/);
  assert.match(config, /owner:\s*apet97/);
  assert.match(config, /name:\s*plaky115(?:\s|$)/);
  assert.match(config, /go mod download/);
  assert.doesNotMatch(config, /go mod tidy/);
  assert.match(config, /\{\{ \.ProjectName \}\}_/);
  assert.match(shell, /REPO="apet97\/plaky115"/);
  assert.match(powershell, /\$Repo = "apet97\/plaky115"/);
  assert.match(shell, /raw\.githubusercontent\.com\/apet97\/plaky115\/main\/cli\/scripts\/install\.sh/);
  assert.match(powershell, /raw\.githubusercontent\.com\/apet97\/plaky115\/main\/cli\/scripts\/install\.ps1/);
  assert.match(shell, /\$\{BINARY_NAME\}_\$\{os\}_\$\{arch\}\.tar\.gz/);
  assert.match(powershell, /plaky115_Windows_\$arch\.zip/);
});
