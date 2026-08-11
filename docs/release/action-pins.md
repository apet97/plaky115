# GitHub Action Pins

Every external action in `.github/workflows/` is pinned to a reviewed commit.
The same-line version comment is for humans; `npm run workflow:policy:test`
enforces the full SHA and approved repository mechanically.

The maintained machine-readable registry is `scripts/action-pins.json`; this
document is checked against it by `npm run workflow:policy:test`.

Pins were resolved on 2026-08-04 with:

```bash
git ls-remote --tags https://github.com/OWNER/REPOSITORY.git \
  refs/tags/VERSION 'refs/tags/VERSION^{}'
```

All selected tags were lightweight tags, so there was no distinct dereferenced
commit. The matching release page in each official repository was reviewed
before accepting the pin.

| Action | Tag | Full commit | Official release | Workflows |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` | [release](https://github.com/actions/checkout/releases/tag/v7.0.1) | CI, live, freshness, CLI release, npm release |
| `actions/setup-node` | `v7.0.0` | `820762786026740c76f36085b0efc47a31fe5020` | [release](https://github.com/actions/setup-node/releases/tag/v7.0.0) | CI, live, freshness, npm release |
| `actions/setup-go` | `v7.0.0` | `b7ad1dad31e06c5925ef5d2fc7ad053ef454303e` | [release](https://github.com/actions/setup-go/releases/tag/v7.0.0) | CI, live, CLI release, npm release |
| `actions/upload-artifact` | `v4.6.2` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | [release](https://github.com/actions/upload-artifact/releases/tag/v4.6.2) | freshness, CLI release |
| `oven-sh/setup-bun` | `v2.2.0` | `0c5077e51419868618aeaa5fe8019c62421857d6` | [release](https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0) | CI, live, npm release |
| `ruby/setup-ruby` | `v1.319.0` | `003a5c4d8d6321bd302e38f6f0ec593f77f06600` | [release](https://github.com/ruby/setup-ruby/releases/tag/v1.319.0) | CI, npm release |
| `goreleaser/goreleaser-action` | `v7.2.3` | `f06c13b6b1a9625abc9e6e439d9c05a8f2190e94` | [release](https://github.com/goreleaser/goreleaser-action/releases/tag/v7.2.3) | CI, CLI release, npm release |

Dependabot checks GitHub Actions weekly. A proposed pin update still requires
review of the official tag, exact commit resolution, release notes, permissions,
and the complete workflow-policy test.
