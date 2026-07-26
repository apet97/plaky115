# Security

Plaky115 is an unofficial toolkit for the Plaky public API. It is not affiliated
with Plaky or CAKE.com.

## Reporting a vulnerability

Report suspected vulnerabilities through GitHub Security Advisories on the
repository (`Security` tab -> `Report a vulnerability`), or open a minimal issue
that omits secrets and reproduction credentials. Do not include API keys, real
workspace data, or `plk_` values in reports.

Please include: affected surface (SDK, CLI, or MCP server), version or commit,
a minimal reproduction, and the observed versus expected behavior.

## Scope

This project ships client code; it does not run a hosted service. The security
surface is local credential handling, transport, and the request/response path.

### API key handling

- Keys are read from the environment (`PLAKY115_API_KEY`, with
  `PLAKY115_API_KEY_AUTH` as a compatibility fallback) or from a caller-supplied
  provider. They are sent as the `X-API-Key` header.
- Keys are never written to logs, errors, screenshots, docs, or command output.
  The SDK and MCP server redact `plk_`-style values; the CLI redacts secrets in
  stderr text.
- `npm run secret:scan` is the required pre-push gate and fails on any committed
  `plk_` value.
- Rotate a key immediately if it is shared in chat, pasted into a file, or used
  in a sacrificial smoke run.

### Transport

- All requests go over HTTPS. Use TLS 1.2 or later. Do not disable certificate
  verification with a custom `fetch`.
- The default base URL is `https://api.plaky.com`. Real workspaces are
  account-prefixed (for example `https://<account>.api.plaky.com`); set
  `serverURL` (SDK), `--server-url` (CLI), or `PLAKY115_BASE_URL` (live sweep) to
  your account host. See `docs/api-behavior.md`.

### Idempotency and replay

- Mutating requests attach an idempotency key only when the caller supplies one,
  and mutations are never retried automatically. An idempotency key can help the
  server deduplicate a caller-managed replay, but it is not an authentication or
  anti-tamper mechanism. Treat the API key as the only authentication credential.

### Signed download links

- Item-file download URLs are short-lived bearer capabilities. Anyone who has a
  still-valid link may be able to download the file without an API key.
- Return a requested link directly to the requesting MCP client, but do not log,
  persist, include, or paste the URL in live-sweep summaries, bug reports, chat,
  screenshots, or diagnostics. The live harness validates the link in memory and
  records only that a URL was present plus its expiry duration.
- Do not prefetch or follow a signed link as part of validation. If a link leaks,
  treat it as sensitive until it expires and rotate or replace the underlying
  file when the exposure warrants it.

### Webhooks (none exposed)

- Plaky's public API exposes no webhooks endpoint: `GET /v1/public/webhooks`
  returns `404` on both the generic and tenant hosts, and the generated OpenAPI
  types declare no webhooks. The SDK ships no webhook-verification helper.
- If Plaky later documents webhooks and a signing scheme, add a verifier aligned
  to the confirmed scheme. See `docs/api-behavior.md`.

## MCP destructive model

The MCP server has no `--confirm` primitive; that is an MCP protocol fact, not a
gap relative to the CLI. Destructive operations are gated through tool
annotations instead:

- Each tool carries hints such as `destructiveHint`, `readOnlyHint`, and
  `idempotentHint`, derived from the operation metadata.
- Destructive operations are marked `destructiveHint: true` and require the
  `destructive` scope to be enabled.
- The MCP host (for example Claude Desktop) is responsible for honoring these
  annotations and prompting the user before running destructive tools.

So the CLI `--confirm` flag and the MCP `destructiveHint` annotation are two
correct gating mechanisms for two different runtimes. They are not an
inconsistency to reconcile.

## Supported surfaces

Security fixes target the current `main`. There is no long-term support branch.
