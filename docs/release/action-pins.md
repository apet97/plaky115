# GitHub Action Pins

Every external action in `.github/workflows/` is pinned to a reviewed commit.
The same-line version comment is for humans; `npm run workflow:policy:test`
enforces the full SHA and approved repository mechanically.

Pins were resolved on 2026-07-26 with:

```bash
git ls-remote --tags https://github.com/OWNER/REPOSITORY.git \
  refs/tags/VERSION 'refs/tags/VERSION^{}'
```

All selected tags were lightweight tags, so there was no distinct dereferenced
commit. The matching release page in each official repository was reviewed
before accepting the pin.

| Action | Tag | Full commit | Official release | Workflows |
| --- | --- | --- | --- | --- |
| `actions/checkout` | `v4.4.0` | `11d5960a326750d5838078e36cf38b85af677262` | [release](https://github.com/actions/checkout/releases/tag/v4.4.0) | CI, live, freshness, CLI release, npm release |
| `actions/setup-node` | `v4.4.0` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | [release](https://github.com/actions/setup-node/releases/tag/v4.4.0) | CI, live, freshness, npm release |
| `actions/setup-go` | `v5.6.0` | `40f1582b2485089dde7abd97c1529aa768e1baff` | [release](https://github.com/actions/setup-go/releases/tag/v5.6.0) | CI, live, CLI release, npm release |
| `actions/upload-artifact` | `v4.6.2` | `ea165f8d65b6e75b540449e92b4886f43607fa02` | [release](https://github.com/actions/upload-artifact/releases/tag/v4.6.2) | freshness, CLI release |
| `oven-sh/setup-bun` | `v2.2.0` | `0c5077e51419868618aeaa5fe8019c62421857d6` | [release](https://github.com/oven-sh/setup-bun/releases/tag/v2.2.0) | CI, live, npm release |
| `ruby/setup-ruby` | `v1.319.0` | `003a5c4d8d6321bd302e38f6f0ec593f77f06600` | [release](https://github.com/ruby/setup-ruby/releases/tag/v1.319.0) | CI, npm release |
| `goreleaser/goreleaser-action` | `v7.2.3` | `f06c13b6b1a9625abc9e6e439d9c05a8f2190e94` | [release](https://github.com/goreleaser/goreleaser-action/releases/tag/v7.2.3) | CI, CLI release, npm release |

Dependabot checks GitHub Actions weekly. A proposed pin update still requires
review of the official tag, exact commit resolution, release notes, permissions,
and the complete workflow-policy test.
