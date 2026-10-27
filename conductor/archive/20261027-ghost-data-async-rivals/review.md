# Review: Ghost Data & Async Rivals

- **Track:** `20261027-ghost-data-async-rivals`
- **Type:** `feature`
- **Branch:** `feat/20261027-ghost-data-async-rivals`
- **Range:** `b88f211fd0813f5114454a61bf6cca78d3c3bb2c..c1f8cc71`
- **Date:** `2026-10-27`
- **Verdict:** `PASS`

## Summary

The ghost pipeline is fully built unit-by-unit — bundle builder, server store,
sync queue, Board UI, spar wiring — but the pipeline is never connected: no
production caller builds a bundle or queues one on a cup win, so real play
never submits a ghost (F1, High). One Medium (bundle aliases live session
state) and three Lows (caps/reader shape skew, asymmetric teardown, inaccurate
version copy) accompany it. All are fixable in a Review Fixes phase; no design
problem, no revert needed.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun run verify` (check + full `bun test --check --parallel` + biome + voxel determinism gate) | pass | exit 0, 2026-10-27 |
| coverage | none configured | n/a | workflow gate `none` |
| lint | `biome check` (inside verify) | pass | 780 files, no findings |
| typecheck | `bun run check` (inside verify) | pass | sim 167 / client 442 / server 44 / voxel 145 files |
| build | `bun run build` | pass | exit 0, pre-existing chunk-size warning |
| visual | desktop + 393px Board ghost section + spar-vs-ghost, Playwright console | pass | `verification/ghost-*.png`, 0 errors / 0 warnings |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 + R1.T1 | `packages/sim/src/cup/ghost.test.ts`, `cup/ghost-capture.test.ts` | covered |
| FR-2 | P3.T1 + R1.T1 | `apps/client/src/cloud/ghosts.test.ts`, `cup/ghost-capture.test.ts` | covered |
| FR-3 | P2.T1, P2.T2 | `ghost/store.test.ts`, `ghost/routes.test.ts` | covered |
| FR-4 | P4.T1 | `board/ghost-section.test.ts`, `board/panel.test.ts` | covered |
| FR-5 | P4.T2 | `spar/ghost.test.ts` | covered |
| FR-6 | P3.T2 | `apps/client/src/cloud/ghosts.test.ts` | covered |
| FR-7 | P2.T1 | `ghost/caps.test.ts`, `ghost/routes.test.ts` | covered |
| AC-1 | P1.T2 + R1.T1 | `packages/sim/src/cup/ghost.test.ts`, `cup/ghost-capture.test.ts` | covered |
| AC-2 | P3.T1 + R1.T1 | `apps/client/src/cloud/ghosts.test.ts`, `cup/ghost-capture.test.ts` | covered |
| AC-3 | P2.T2 | `ghost/routes.test.ts` | covered |
| AC-4 | P4.T1 | `board/ghost-section.test.ts`, `ghost-board-desktop.png` | covered |
| AC-5 | P4.T2 | `spar/ghost.test.ts` | covered |
| AC-6 | P3.T2 | `apps/client/src/cloud/ghosts.test.ts` | covered |
| AC-7 | P2.T1 | `ghost/caps.test.ts`, `ghost/routes.test.ts` | covered |
| NFR-1 | P1.T2 | `cup/ghost.test.ts` | covered |
| NFR-2 | P1.T1, P3.T1 | save schema stays v25 | covered |
| NFR-3 | P4.T1, P4.T2, R1.T1 | module-size guard 5 pass, `main.ts` 12256 B | covered |
| NFR-4 | P2.T1 | `caps.test.ts` (no PII in bundle) | covered |
| NFR-5 | P3.T1, P3.T2 | `ghosts.test.ts` quiet/non-blocking | covered |

## Findings

### Critical

- none

### High

- **F1 — Ghost pipeline never wired: cup win captures and queues nothing**
  - **File:** `apps/client/src/cup/results.ts:62-68`
  - **What:** `buildGhostBundle` and `sync.queueGhost` have zero production
    callers (primary-validated: only definitions + test call sites). A cup win
    creates no bundle and queues nothing, so the server never receives a ghost
    in real play.
  - **Why:** FR-1/FR-2 and AC-1/AC-2 fail at integration despite passing unit
    tests. The Board Ghost rivals section can only ever show seeded/manual
    data.
  - **Fix:** In `conclude()` (and any live-cup finalize path) call
    `buildGhostBundle(session)` on champion status and
    `sync.queueGhost(bundle)` around `onFinalize`; add a cup→cloud integration
    test that a champion session queues and flushes after the save push.
  - **Requirement:** FR-2
  - **Test gap:** cup→cloud integration test: champion finalize queues pending
    ghost, next push flushes it

### Medium

- **F2 — Bundle aliases live session state**
  - **File:** `packages/sim/src/cup/ghost.ts:61-79`
  - **What:** `buildGhostBundle` returns live `sides[0]/sides[1]` references
    without copying kit/events.
  - **Why:** Later session mutation aliases the queued bundle; the queue path
    stringifies today but any held bundle is fragile.
  - **Fix:** Return copies (`kit: [...kit]`, `stats: {...stats}`,
    `events: [...events]`).
  - **Requirement:** FR-1
  - **Test gap:** mutate session after `buildGhostBundle`, assert bundle
    unchanged

### Low

- **F3 — Caps and spar reader disagree on `element`**
  - **File:** `apps/server/src/ghost/caps.ts:33-39`
  - **What:** `isGhostSide` requires name/kit/stats but not `element`, while
    the spar reader requires non-empty `element` for fightability.
  - **Why:** An element-less bundle stores and lists but is permanently
    unboutable with no version note (bare row).
  - **Fix:** Require a non-empty `element` string in `isGhostSide` (or drop the
    requirement in `readGhostContender` — pick one contract).
  - **Requirement:** FR-7
  - **Test gap:** caps test for element-less side rejected (or reader test if
    relaxed)
- **F4 — `update(null)` teardown keeps a stale `pendingGhost`**
  - **File:** `apps/client/src/spar.ts:256-265`
  - **What:** The null-creature teardown stops/hides but does not clear
    `pendingGhost`, while both close handlers do.
  - **Why:** A stale ghost contender survives a partner-loss teardown until
    the next `open()`; asymmetric cleanup.
  - **Fix:** Set `pendingGhost = null` in the null-creature branch.
  - **Requirement:** FR-5
  - **Test gap:** none (behavioral symmetry; covered by existing teardown tests)
- **F5 — Version note says "older build" for any skew**
  - **File:** `apps/client/src/board/copy.ts:84-85`
  - **What:** `GHOST_VERSION_COPY` says "older build" but fires for any
    version mismatch including newer.
  - **Why:** Inaccurate quiet note for future-version bundles.
  - **Fix:** Reword version-neutral, e.g. "Recorded on a different build —
    kept for the board, not for bouts."
  - **Requirement:** FR-4
  - **Test gap:** none (copy change; existing copy test asserts the export)

## Overrides

- none

## Plan compliance

P1–P4 each `verified` with `Result`, `Checkpoint`, and `Evidence`. `Touches`
respected except recorded deviations D1–D8 (all reasonable, minimal).
Unrecorded gap: P1.T1.2 "capture on cup win path" and P3.T1.1 "flush ordering"
assumed a cup→`queueGhost` call site that does not exist — this is F1 above,
now tracked as Phase R1.

## Re-review (round 2)

Phase R1 (`c1f8cc71`, evidence `verification/phase-r1.md`) resolves all five
round-1 findings at their exact fix sites:

- **F1:** `captureCupGhost` is called from the one production finalize site
  (`createCupScreen` `onFinalize`, `apps/client/src/app/screens.ts`) with the
  finished session; the cloud sync arrives via `ScreenDeps.cloudSync`
  (deviation D9 — keeps `main.ts` at 12256 B, under cap). New
  `cup/ghost-capture.test.ts` covers the reviewer's test gap verbatim:
  champion queues a `verifyGhostBundle`-true bundle, loss/forfeit queue
  nothing, and the queued bundle flushes after the save push through a real
  `createGhostSubmitter`. FR-1/FR-2 and AC-1/AC-2 are now covered.
- **F2:** sides and events are copied on capture; the mutation test
  (kit push, hp overwrite, events truncation) asserts byte-identity and
  replayability.
- **F3:** `isGhostSide` requires a non-empty `element`; rejection tests for
  missing/empty element added. Store and spar reader agree.
- **F4:** creature-loss teardown clears `pendingGhost`, symmetric with both
  close handlers.
- **F5:** version note is direction-neutral.

Re-verified: cup/cloud/spar/board + sim + server suites 1754 pass / 1 skip /
0 fail; `check` clean (sim 167 / client 444 / server 44 / voxel 145);
`build` exit 0; module-size guard pass; `biome check` on touched files clean.
No new findings. Verdict flips to **PASS**.

## Out of scope

- none (reviewer raised no out-of-scope discoveries)

## Debt

- none yet (strict mode: no deferrals; `review.issues.enabled` is false so
  nothing is filed as issues — all findings go to Phase R1)

## Doc sync

`done` — product/tech-stack synced pre-review; R1 adds one tech-stack line for
the F1 finalize→queue wiring (`captureCupGhost` → `queueGhost`).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 1 | 3 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 5 |
