const npmGate = (id, script) => Object.freeze({ id, kind: "npm-script", script, phase: "check" });
const commandGate = (id, command, args, options = {}) => Object.freeze({
  id,
  kind: "command",
  command,
  args: Object.freeze([...args]),
  phase: options.phase ?? "check",
  cwd: options.cwd,
  env: options.env === undefined ? undefined : Object.freeze({ ...options.env }),
});

// Keep the release-facing verification order explicit. The inventory test uses
// this same data, so adding a tracked verification test without adding its
// package script remains a hard failure.
export const verificationPlan = Object.freeze([
  npmGate("workflow-policy", "workflow:policy:test"),
  npmGate("verification-inventory", "verification:inventory:test"),
  npmGate("verification-runner", "verification:runner:test"),
  npmGate("release-contract", "release:contract:test"),
  npmGate("release-artifacts", "release:artifacts:test"),
  npmGate("release-network", "release:network:test"),
  npmGate("npm-publication", "npm:publication:test"),
  npmGate("compatibility-inventory", "compatibility:inventory:test"),
  npmGate("installers", "installer:test"),
  npmGate("contract-source", "contract:source:test"),
  npmGate("contract-inventory", "contract:inventory:test"),
  npmGate("overlay", "overlay:validate"),
  npmGate("openapi-lint", "lint:openapi"),
  npmGate("openapi", "openapi:test"),
  npmGate("metadata", "metadata:test"),
  npmGate("expected-operations", "contract:expected:check"),
  npmGate("generated-drift", "generated:drift"),
  npmGate("codegen", "codegen:test"),
  npmGate("surface-audit", "test:surfaces"),
  npmGate("docs-surface", "docs:surface:test"),
  npmGate("examples", "examples:check"),
  npmGate("live-sweep-source", "live:sweep:test"),
  commandGate("sdk-build", "npm", ["--prefix", "sdk", "run", "build"], { phase: "build" }),
  commandGate("sdk-typecheck", "npm", ["--prefix", "sdk", "run", "typecheck"]),
  commandGate("sdk-type-tests", "npm", ["--prefix", "sdk", "run", "test:types"]),
  commandGate("sdk-lint", "npm", ["--prefix", "sdk", "run", "lint"]),
  commandGate("sdk-tests", "npm", ["--prefix", "sdk", "test"]),
  commandGate("mcp-build", "npm", ["--prefix", "mcp-server", "run", "build"], { phase: "build" }),
  commandGate("mcp-lint", "npm", ["--prefix", "mcp-server", "run", "lint"]),
  commandGate("mcp-tests", "npm", ["--prefix", "mcp-server", "test"]),
  commandGate("cli-tests", "go", ["test", "./..."], { cwd: "cli", env: { GOTOOLCHAIN: "go1.26.5" } }),
  commandGate("cli-build", "go", ["build", "-o", "{cliBinary}", "./cmd/plaky115"], {
    cwd: "cli",
    phase: "build",
    env: { GOTOOLCHAIN: "go1.26.5" },
  }),
  commandGate("cli-help", "{cliBinary}", ["--help"]),
  commandGate("cli-raw-help", "{cliBinary}", ["raw", "--help"]),
  commandGate("cli-doctor", "{cliBinary}", ["doctor"], { env: { PLAKY115_API_KEY: "ci-stub" } }),
  npmGate("cross-surface-parity", "parity:test"),
  npmGate("strict-surface-status", "status:surfaces:strict"),
  npmGate("secret-scan-tests", "secret:scan:test"),
  npmGate("secret-scan", "secret:scan"),
  npmGate("artifact-audit", "artifacts:audit"),
  npmGate("pack-smoke", "pack:smoke"),
  npmGate("package-snapshot", "packsnapshot:drift"),
  npmGate("consumer-smoke", "package:consumer-smoke"),
  commandGate("goreleaser", "goreleaser", ["check"], { cwd: "cli" }),
]);

export function verificationScriptNames(plan = verificationPlan) {
  return plan.filter((gate) => gate.kind === "npm-script").map((gate) => gate.script);
}
