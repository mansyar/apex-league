# Release Funnel

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `chore`
**Priority:** `high`
**Branch:** `chore/20261026-release-funnel`
**Depends on:** none

## Summary

Puts the client on Cloudflare Pages behind a GitHub Actions deploy job, proves
the deployed build with a Playwright smoke check against the live URL, and
brings the release documentation back in line with the code. No game behaviour
changes; the save schema stays at v25.

## Artifacts

- `verification/` — phase evidence, created during implementation
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before opening a PR
