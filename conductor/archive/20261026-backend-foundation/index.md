# ElysiaJS Backend Foundation

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** feature
**Priority:** high
**Branch:** `feat/20261026-backend-foundation`
**Depends on:** none

## Summary

Gives the game a server: an ElysiaJS service on Bun that issues anonymous
trainer identities and stores cloud saves in SQLite, deployed as a Docker
container to a Coolify VPS. The client gains a second `SaveAdapter` backed by
that API — pulling once at boot, pushing behind the existing autosave, and
resolving conflicts by `savedAt` without ever blocking play.

The whole career currently lives in one browser's `localStorage`. This track is
what stops a cleared cache from destroying sixty days of play, and it is the
gate on leaderboards, ghost data and async PvP.

`SAVE_VERSION` stays 25: the cloud stores the payload the client already writes.

## Artifacts

- `verification/` — phase evidence, created during implementation
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before opening a PR
