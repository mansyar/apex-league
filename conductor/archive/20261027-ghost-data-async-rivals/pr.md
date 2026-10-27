# Pull Request: Ghost Data & Async Rivals

## Summary

Cup-winning runs now leave a ghost behind. On a championship finalize the
client captures a deterministic replay bundle (sim version + seed + both kits
+ the full event log), queues it beside the save, and submits it after the
save push. The server keeps one best ghost per trainer with a top-100 board,
plausibility caps, and offline snapshot fallback. The Board gains a Ghost
rivals section with preview + Fight; spar-vs-ghost bouts are local-only —
nothing is written back to cups, ladder, or the ranch.

**No save-schema change.** `SAVE_VERSION` is still 25; the queue rides the
existing cloud-sync push and the bundle is verified byte-identical by replay.

## Track

- **ID:** `20261027-ghost-data-async-rivals`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261027-ghost-data-async-rivals/spec.md`](conductor/archive/20261027-ghost-data-async-rivals/spec.md)
- **Plan:** [`conductor/archive/20261027-ghost-data-async-rivals/plan.md`](conductor/archive/20261027-ghost-data-async-rivals/plan.md)
- **Review:** [`conductor/archive/20261027-ghost-data-async-rivals/review.md`](conductor/archive/20261027-ghost-data-async-rivals/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Sim bundle | Version-pinned ghost bundle + deterministic replay verifier | verified | `4df6be67` | `SIM_VERSION = 1`; forfeits/boss walkovers yield null (no sides, no bundle). |
| 2: Server store | Per-trainer-best ghost store, caps, top-100 routes | verified | `291f1b98` | Migration `0003_ghost.sql` adds one table; committed-SQL ledger pattern kept. |
| 3: Sync path | Queue beside the save, flush after push, offline snapshot | verified | `1d433395` | `save-payload.ts` extracted verbatim (client module caps); fake-API stubs in tests. |
| 4: Board + spar UI | Ghost rivals section, preview + Fight, local-only bout | verified | `d0a36e77` | `board/boot.ts` extraction keeps `main.ts` at 12256 B (12 KB cap); desktop + 393 px screenshots, 0 console errors. |
| R1: Review fixes | Resolve all five round-1 findings at root cause | verified | `c1f8cc71` | The round-1 BLOCK: cup wins captured and queued nothing. `captureCupGhost` now runs at the one finalize site via `ScreenDeps.cloudSync` (deviation D9); copy-on-capture; caps require `element`; teardown clears `pendingGhost`; version copy is direction-neutral. |

## Requirements

- [x] `FR-1` — A championship final produces a deterministic, replay-verifiable ghost bundle (sim version, seed, day, round, both kits, event log, winner)
- [x] `FR-2` — The bundle is queued beside the save and submitted after the save push; quiet and non-blocking offline
- [x] `FR-3` — The server keeps one best ghost per trainer and serves a top-100 board
- [x] `FR-4` — The Board shows a Ghost rivals section with badge, preview line, and Fight entry point
- [x] `FR-5` — Spar-vs-ghost bouts run locally with no cups/ladder/mutation side effects
- [x] `FR-6` — Board and ghost loaders degrade to offline snapshot, then unavailable, without throwing
- [x] `FR-7` — Oversize, foreign-version, and implausible ghosts are rejected quietly
- [x] `NFR-1` — Replay is byte-identical across runs (deterministic seeds only)
- [x] `NFR-2` — Save schema stays at v25; no migration, no new persisted shape
- [x] `NFR-3` — Client/sim module caps hold (`main.ts` 12256 B; guard 5 pass)
- [x] `NFR-4` — No PII in the bundle or on the board
- [x] `NFR-5` — Ghost traffic is quiet and non-blocking on the save path
- [x] `AC-1` — Champion finalize captures a `verifyGhostBundle`-true bundle through the production finalize site
- [x] `AC-2` — The queued bundle flushes after the save push; offline retries stay silent
- [x] `AC-3` — Two-device check: second trainer's ghost appears on the board's top-100
- [x] `AC-4` — Board Ghost section renders badge + preview + Fight (desktop + 393 px)
- [x] `AC-5` — Spar-vs-ghost bout completes locally with no state mutation
- [x] `AC-6` — Offline open shows the snapshot with the stale note
- [x] `AC-7` — Oversize/foreign submissions rejected; unwritable DB stays quiet

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun test --check --parallel --timeout 120000` | pass — full suite green, 0 fail | `conductor/archive/20261027-ghost-data-async-rivals/verification/phase-r1.md` |
| static | `bun run check` | pass — no type errors (sim 167 / client 444 / server 44 / voxel 145) | `verification/phase-r1.md` |
| lint / format | `bunx biome check` | pass — touched files clean | `verification/phase-r1.md` |
| determinism | `bun run gate:determinism` | pass — creature GLBs + props byte-identical | `bun run verify` log |
| build | `bun run build` | pass — exit 0 | `verification/phase-4.md` |
| visual | Playwright vs local stack (server :3001 + client dev) | pass — Board ghost section + spar bout, desktop + 393 px, 0 console errors | `verification/ghost-board-desktop.png`, `ghost-spar-desktop.png`, `ghost-board-mobile.png` |
| integration | `cup/ghost-capture.test.ts` | pass — champion queues + flushes, loss/forfeit queue nothing, byte-parity with the sim builder | `verification/phase-r1.md` |

## Media

Screenshots are recorded as track evidence (gitignored PNGs, not embedded
here — `media: always` is satisfied by the files below):

- `verification/ghost-board-desktop.png` — Boards tab, Ghost rivals rank 1 with badge, preview, and Fight
- `verification/ghost-spar-desktop.png` — spar-vs-ghost bout ("a free bout — nothing saved")
- `verification/ghost-board-mobile.png` — Ghost rivals section at 393 px in one-column language

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 5 findings (1 High, 1 Medium, 3 Low)
- **Accepted/deferred:** 0

## Deviations and risks

- **D9 (carried from R1):** the cloud sync reaches the cup through
  `ScreenDeps.cloudSync` instead of a per-screen closure, keeping `main.ts`
  under its 12 KB cap. Spar/graduation ignore the field.
- **Board content depends on the server.** With no reachable API the Ghost
  section falls back to the offline snapshot, then hides — by design, never an
  error surface.
- **One ghost per trainer.** Only the latest championship bundle is kept; there
  is no history, no pagination past top-100, and no friend/challenge flow —
  all explicit non-goals in the spec.

## Follow-ups

None. `review.issues` is disabled in this project's workflow config, so the
findings were all resolved in-track rather than filed as issues.

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migration and no data concerns on the client: the save schema is untouched
at v25 and the queue is local-only until flushed. On the server, migration
`0003_ghost.sql` adds one table; reverting the code leaves an empty table
behind, which is harmless and re-used if the track re-lands.
