# Threat Model

Plaky115 is local client software. It trusts the caller, the installed package
or binary, the selected Plaky API host, and the platform TLS/root store. It does
not trust remote redirects, response sizes, workspace content, archive contents,
or ambiguous human-readable entity references.

## Controls

- API keys come from providers, environment variables, or CLI stdin. They are
  redacted from errors and never belong in argv, files, logs, or screenshots.
- Remote HTTP is rejected; literal loopback HTTP is a development exception.
  Credential-bearing SDK and Go requests use manual/no redirect behavior.
- Buffered bodies are bounded to prevent memory exhaustion. Streaming remains
  explicit. Timeouts and retry counts must be finite and non-negative.
- Only GET requests retry. Writes are sequential and single-attempt. Ambiguous
  or conflicting entity references fail before a write.
- MCP starts curated/read-only. Write and destructive scopes are opt-in;
  destructive raw tools retain protocol annotations. Uploads accept validated
  base64 and names, never local paths.
- Signed file URLs are bearer capabilities. They are returned only on request
  and are never followed, persisted, logged, or summarized.
- Installers bind an exact release archive to its exact `checksums.txt`, reject
  unsafe archive paths, and replace an installed binary only after validation.
- npm publication is OIDC-only and tag-bound. Checkout HEAD, peeled tag commit,
  workflow ref, package versions, registry digest, and provenance must agree.

Custom transports are inside the caller's trust boundary: a custom `fetch` or
`http.Client` must preserve TLS, no-redirect credential handling, cancellation,
and response limits. See `SECURITY.md` for reporting and operational guidance.
