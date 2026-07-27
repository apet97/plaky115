# Plaky API key grammar and redaction

Plaky115 treats an API key as the literal prefix `plk_` followed by one or more
ASCII letters, digits, underscores, or hyphens. The canonical regular
expression is:

```text
plk_[A-Za-z0-9_-]+
```

The shortest matching value has a one-character tail. Matching stops before
any character outside the tail character class. Every matching value is
replaced in full with the sole redaction marker:

```text
[REDACTED_PLAKY_API_KEY]
```

The split-literal corpus in
`test/fixtures/security/plaky-api-key-cases.json` is the compatibility contract
for the TypeScript SDK, Go SDK/CLI, live sweep, and repository scanner. Tests
join its parts only at runtime so the repository never stores a complete
token-shaped fixture.

The repository scanner walks files directly, does not follow symlinks, and
does not rely on ignore-file behavior. It intentionally scans
`.live-artifacts` because live proof output is security-sensitive.
