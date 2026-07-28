import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const installer = join(root, "cli/scripts/install.sh");

test("Unix installer verifies the exact checksum before atomically replacing the binary", async () => {
  const fixture = await createFixture();
  try {
    const result = runInstaller(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(join(fixture.install, "plaky115"), "utf8"), "new binary\n");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("Unix installer preserves an existing binary on checksum mismatch", async () => {
  const fixture = await createFixture({ checksum: "0".repeat(64) });
  try {
    const result = runInstaller(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /checksum mismatch/i);
    assert.equal(await readFile(join(fixture.install, "plaky115"), "utf8"), "old binary\n");
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test("Unix installer rejects missing binaries and duplicate checksum entries", async () => {
  for (const mode of ["missing", "duplicate"]) {
    const fixture = await createFixture({ mode });
    try {
      const result = runInstaller(fixture);
      assert.notEqual(result.status, 0, mode);
      assert.equal(await readFile(join(fixture.install, "plaky115"), "utf8"), "old binary\n");
    } finally { await rm(fixture.root, { recursive: true, force: true }); }
  }
});

test("both installers fail closed on checksum, archive path, and test-URL boundaries", async () => {
  const shell = await readFile(installer, "utf8");
  const powershell = await readFile(join(root, "cli/scripts/install.ps1"), "utf8");
  assert.match(shell, /sha256sum|shasum/);
  assert.match(shell, /archive contains an unsafe path/);
  assert.match(shell, /PLAKY115_INSTALL_TESTING/);
  assert.match(powershell, /Get-FileHash -Algorithm SHA256/);
  assert.match(powershell, /archive contains an unsafe path/);
  assert.match(powershell, /PLAKY115_INSTALL_TESTING/);
  assert.match(powershell, /Remove-Item \$target -Force[\s\S]*Move-Item \$backup \$target/);
  assert.doesNotMatch(`${shell}\n${powershell}`, /raw\.githubusercontent\.com.*\|\s*(bash|iex)/i);
});

test("Unix installer rejects non-SemVer tags before download", () => {
  const result = spawnSync("bash", [installer], {
    encoding: "utf8",
    env: { ...process.env, PLAKY115_VERSION: "v1evil.2.3" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exact v<semver> tag/i);
});

async function createFixture({ checksum, mode } = {}) {
  const rootDir = await mkdtemp(join(tmpdir(), "plaky115-installer-test-"));
  const release = join(rootDir, "releases", "v0.2.1");
  const payload = join(rootDir, "payload");
  const install = join(rootDir, "install with spaces");
  await Promise.all([mkdir(release, { recursive: true }), mkdir(payload), mkdir(install)]);
  await writeFile(join(install, "plaky115"), "old binary\n");
  const archive = join(release, archiveName());
  if (mode === "missing") {
    await writeFile(join(payload, "README.md"), "missing\n");
    execFileSync("tar", ["-czf", archive, "README.md"], { cwd: payload });
  } else {
    await writeFile(join(payload, "plaky115"), "new binary\n");
    await chmod(join(payload, "plaky115"), 0o755);
    execFileSync("tar", ["-czf", archive, "plaky115"], { cwd: payload });
  }
  const actual = execFileSync("shasum", ["-a", "256", archive], { encoding: "utf8" }).split(/\s+/)[0];
  const line = `${checksum ?? actual}  ${archiveName()}\n`;
  await writeFile(join(release, "checksums.txt"), mode === "duplicate" ? line + line : line);
  return { root: rootDir, releaseRoot: join(rootDir, "releases"), install };
}

function runInstaller(fixture) {
  return spawnSync("bash", [installer], { encoding: "utf8", env: {
    ...process.env, PLAKY115_VERSION: "v0.2.1", PLAKY115_INSTALL_DIR: fixture.install,
    PLAKY115_INSTALL_TESTING: "1", PLAKY115_INSTALL_TEST_BASE_URL: `file://${fixture.releaseRoot}`,
  } });
}

function archiveName() {
  const os = process.platform === "darwin" ? "Darwin" : "Linux";
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";
  return `plaky115_${os}_${arch}.tar.gz`;
}
