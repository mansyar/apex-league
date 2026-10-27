# Phase 3 verification — Ghost auto-submit + fetch + offline snapshot

Track: 20261027-ghost-data-async-rivals · Phase 3 · FR-2, FR-6, NFR-2, NFR-5 · AC-2, AC-6.
All work stayed inside `apps/client/src/cloud/*`. No `packages/sim`, `apps/server`,
or plan changes. No save-schema version bump: the bundle is derived from the cup
session and travels beside the save, never inside it.

## What changed

- `api.ts` — ghost endpoints on `CloudApi`: authenticated `PUT /trainers/:id/ghost`
  (`submitGhost`, passphrase in the body like a save push), public
  `GET /trainers/:id/ghost` (`readGhost`) and `GET /ghosts` (`readGhosts`, no
  passphrase), plus `GhostBoardEntry` / `GhostBoardPayload` / `GhostRecord` /
  `GhostReceipt` types. The bundle stays `unknown` (opaque) through the whole
  sync path: the spar reader, not sync, decides replayability.
- `ghosts.ts` (new, ~6 KB) — `createGhostSubmitter` (`queueGhost` persists the
  pending bundle under `apex.ghost.pending`, `submitPending` PUTs it and clears
  only on `stored: true`; offline/rejected/signed-out stay queued and quiet;
  corrupt pending rows drop quietly) and `createGhostBoardLoader` (`load()`
  returns `live | snapshot | unavailable`, writes the snapshot only on a full
  answer, falls back whole, drops malformed rows, never throws).
- `sync.ts` — `CloudSync.queueGhost` hook; `submitPending()` flushes after the
  save push in both debounced `pushNow` paths (failure and success) and after a
  successful first-submit `uploadLocal`. Flush ordering: the save request goes
  first, the ghost second, fire-and-forget. Ghost failures never touch status.
- `save-payload.ts` (new, ~1 KB) — `fingerprint` / `savedAtOf` moved verbatim
  out of `sync.ts` so the hook fits the 12 KB module cap; no behavior change.
- `sync.test.ts` — fake-API stubs for the three new endpoints (interface
  extension required them for `bun run check`).
- `ghosts.test.ts` (new, 16 tests) — submitter, loader, and sync-hook ordering.

## Verification (all green, exit code 0)

- `bun test apps/client/src/cloud/ghosts.test.ts --parallel=4` → 16 pass, 0 fail,
  40 expects.
- `bun test apps/client/src/cloud --parallel=4` → 107 pass, 0 fail, 293 expects
  (baseline 91 + 16 new), across 10 files.
- `bun run check` → no type errors (voxel 145, sim 167, server 44, client 435).
- `bun test apps/client/src/module-size.test.ts` → 5 pass (sync.ts back under the
  12 KB cap after the helper extraction and comment trim; flagged 13252 B before).
- `bunx biome check` on all six touched files → clean.

## AC coverage

- AC-2 (ghost submits alongside the save push, no blocking UI): submitter +
  sync-hook tests — queued bundle flushes as `calls[1]` after `push:trn`, offline
  push keeps the bundle and flushes both on the next online push, rejected/failed
  submits leave the save push and status untouched.
- AC-6 (offline Board shows the last snapshot with stale copy): loader tests —
  offline-after-live serves the whole snapshot with its original `fetchedAt`,
  no-snapshot offline is `unavailable` without throwing, malformed rows/body fall
  back whole, empty board is `live []`, unwritable storage stays quiet, corrupt
  snapshot reads as absent, shared display names both list in server order.

## Deviations

- `save-payload.ts` extraction (fingerprint/savedAtOf moved, not copied) — the
  track brief anticipated sync.ts was near the 12 KB cap and asked for a small
  additive module over growing it; the hook alone pushed sync.ts 964 B over, so
  the pure helpers moved to their own module. Same code, same behavior.
- `sync.test.ts` fake-API stubs — required by the `CloudApi` extension so
  `bun run check` stays green; no existing expectations changed.
- Malformed-wire test stubs use `as unknown as GhostBoardPayload`, matching the
  `board/fetch.test.ts` precedent for feeding bad server bodies past the types.
