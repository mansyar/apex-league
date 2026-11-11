# Phase 4 evidence — Reduced Motion + Visual Pass

- Track: 20261111-presentation-mapping
- Phase: P4 (Reduced + Visual)
- Date: 2026-11-11
- Branch: `feat/20261111-presentation-mapping`
- Base: `127049f2` (Phase 3 checkpoint)
- Head: `7e5c9054`
- Result: **verified**

## Summary

FR-9 reduced-motion flashes are implemented as a static capped flash
language (`reduced-flash.ts` + `ReducedReporter`) that replaces poses,
bursts, the wedge, squash, and shake on the reduced path; bodies still
track the stream, so the verdict is identical. Replay parity holds: the
battle-trace standing hash is still `0xc579e9ae` and a reduced-vs-full
dense test asserts identical poses, stage targets, and verdict. The
Playwright visual pass ran at desktop and iPhone 15 widths with a clean
console (0 errors, 0 warnings); paced replay showed no jank, which per
the spec assumption is the frame-time harness. `packages/sim` untouched.

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| static+unit+determinism | `bun run verify` | 0 | 4089 pass, 1 skip, 0 fail (4090 tests, 373 files, 461639 expects); biome clean (928 files); determinism gate OK; battle-trace hash `0xc579e9ae`, 5/5 invariants |
| build | `bun run build` | 0 | 416 modules transformed, chunk-size warning only (pre-existing) |
| visual desktop | `playwright-cli open http://localhost:5175` + drive spar (reduced) + `screenshot` + `console` | 0 | end-screen + mid-replay shots, console 0 errors / 0 warnings |
| visual phone | `playwright-cli open --device="iPhone 15" http://localhost:5175` + drive spar (reduced) + `screenshot` + `console` | 0 | end-screen + mid-replay shots, console 0 errors / 0 warnings, no layout breakage |

Verify and build were run as two separate commands. Visual pass drove a
real spar (Ember Drake, Motion: reduced): reduced fights dump instantly
to the KO end screen; "Replay slowly" exercised the paced dense playback
mid-fight at both widths.

## What changed

- `apps/client/src/reduced-flash.ts` (new): `flashForPose` mapping
  (hit/dodge/crush/pin/ko/tell), `REDUCED_FLASH_MAX = 4` static FIFO
  layer (no clock, no travel, no fade), and `createReducedReporter`,
  which owns every reduced entry edge (startup tell, roll/press entry,
  pin rising edge, non-killing hits, KO snap) plus the KO snap state.
- `apps/client/src/dense-playback.ts`: thin reduced branches that
  delegate to the reporter; full-motion paths untouched. The reporter
  was split out of this file mid-phase because the first cut pushed it
  294 B over the 12 KB module cap.
- `apps/client/src/reduced-flash.test.ts` (new, 16 tests): mapping
  table, layer cap/FIFO/static-height/reset, and dense-stage integration
  (hit, break, startup tell, roll entry, pin edge, KO snap, full-motion
  control, reduced-vs-full parity on poses/stage/verdict, reset re-arm).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-9 | FR-9: reduced-motion flashes for every event, outcome-identical | 16 unit/integration tests; live spar at both widths ends Victory/KO with final postures matching | pass |
| AC-11 | Replay parity: replays byte-identical, standing hash `0xc579e9ae` | `bun run verify` battle-trace hash + 5/5 invariants; reduced-vs-full parity test; determinism gate OK | pass |
| NFR-1 | Zero sim diff (replay hashes byte-identical) | No changes under `packages/sim`; hash unchanged | pass |
| NFR-5 | Reduced-motion contract (flashes replace motion, verdict identical) | Reporter owns all reduced edges; parity test; `c.pose`/`c.poseK` channels untouched on reduced path | pass |
| NFR-3 | Reference fights hold frame-time profile at both widths | Spec assumption: the visual pass itself is the harness; paced replay smooth, no jank observed, console clean | pass |

## Screenshots

- `.conductor/evidence/20261111-presentation-mapping/phase-4-desktop.png` — reduced end screen (Victory, KO)
- `.conductor/evidence/20261111-presentation-mapping/phase-4-desktop-replay.png` — mid-action paced replay, desktop
- `.conductor/evidence/20261111-presentation-mapping/phase-4-phone.png` — reduced end screen, iPhone 15 width
- `.conductor/evidence/20261111-presentation-mapping/phase-4-phone-replay.png` — mid-action paced replay, phone width

## Deviations

- `ReducedReporter` split out of `dense-playback.ts` into
  `reduced-flash.ts` (brief-anticipated: "split deliberately" when the
  flash language does not fit its module). Same Touches, no new files
  outside them.
- Phone-width Spar tap: a `.hud-motion` overlay intercepts pointer
  events on the Spar button at iPhone 15 width, so the tap was dispatched
  with `playwright-cli eval "el => el.click()"` on the real button (real
  handler, real fight). This is a pre-existing layout quirk outside phase
  Touches — flagged for the primary, not fixed here.
- The `bun run dev` server (port 5175) was left running: stopping it needs
  a process kill, which this phase's tool permissions do not allow.

## Notes

- Fix iterations: first `bun run verify` failed only the module-size cap
  (dense-playback 12,582 B); second failed only two Biome formats
  (import order, one long test line); third run fully green.
- Flash colors reuse the existing hit/pin/KO palette language (amber
  hits/tells, blue dodges, orange crushes, red pins/KOs); meshes are
  shared-geometry spheres with per-kind scale, disposed on reset.
- KO under reduced: down at once, one ko flash, no reel, no dust; killing
  blow never double-reports as hit + ko.
- Frame-time: no quantitative profiler exists in the repo; per the spec
  assumption the visual pass is the harness. No new per-frame work was
  added (flashes spawn outside the frame loop, ≤4 alive, static).
