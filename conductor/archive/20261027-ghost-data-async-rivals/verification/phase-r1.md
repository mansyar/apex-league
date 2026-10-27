# Phase R1 Evidence — Review Fixes (round 1 BLOCK → fixes)

- **Track:** Ghost Data & Async Rivals (`20261027-ghost-data-async-rivals`)
- **Phase:** R1 (review fixes F1–F5)
- **Date:** 2026-10-27
- **Branch:** `feat/20261027-ghost-data-async-rivals`
- **Commits:** (R1 acceptance commit)
- **Result:** verified — all five round-1 findings resolved, suites green

## What changed

- **F1 (High):** the cup-win ghost now has a production call site. New
  `apps/client/src/cup/ghost-capture.ts` (`captureCupGhost`: build via the
  sim, queue non-null, silent otherwise) is called from the one finalize
  site — `createCupScreen`'s `onFinalize` — with the finished session. The
  cloud sync reaches the cup through a new `cloudSync` field on `ScreenDeps`
  (`Pick<CloudSync, "queueGhost"> | null`); `main.ts` binds
  `cloud?.sync ?? null`, so a cloud-less build captures silently into
  nothing. Losses, forfeits, and live sessions return null from
  `buildGhostBundle` and queue nothing. Deviation D9: the binding rides
  `ScreenDeps` (not a per-screen closure) to keep `main.ts` under the 12 KB
  module cap (12256 B).
- **F2 (Medium):** `buildGhostBundle` copies on capture — sides get fresh
  `stats`/`kit`, the event log is spread. New test mutates the live session
  post-capture (kit push, hp overwrite, events truncation) and asserts the
  bundle is byte-identical and still replays.
- **F3 (Low):** server `isGhostSide` now requires a non-empty `element`,
  matching the spar reader exactly — an element-less bundle can no longer
  store-and-list-yet-never-bout. Fixture sides already carried elements;
  added missing/empty-element rejection tests.
- **F4 (Low):** `spar.ts` creature-loss teardown now clears `pendingGhost`,
  matching both close handlers.
- **F5 (Low):** `GHOST_VERSION_COPY` is direction-neutral ("a different
  build"), firing on any version skew as the reader does.

## Verification

- `bun test apps/client/src/cup apps/client/src/cloud apps/client/src/spar apps/client/src/board packages/sim apps/server --parallel=4` → 1754 pass / 1 skip / 0 fail
- New: `ghost-capture.test.ts` — champion queues a `verifyGhostBundle`-true
  bundle; loss + forfeit queue nothing; queued bundle flushes via a real
  `createGhostSubmitter` + `submitPending`; captured bundle matches the
  sim builder byte-for-byte
- `bun run check` → clean (sim 167 / client 444 / server 44 / voxel 145)
- `bun run build` → exit 0
- Module-size guard → pass (`main.ts` 12256 B)
- `biome check` on all touched files → clean (import-sort/format autofixed)

## Deviations

- **D9:** `cloudSync` on shared `ScreenDeps` instead of a `CupScreenDeps`
  closure — keeps `main.ts` under its cap; spar/graduation ignore the field.
- Test-fixture note: the F2 test mutates the session's kit array, which *is*
  the `loadout` array — assertions snapshot pre-mutation copies instead.
