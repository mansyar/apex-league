# Phase 1 evidence — Pose Foundation

Track: 20261111-presentation-mapping · Phase 1 · Date: 2026-11-11
Branch: feat/20261111-presentation-mapping
Base: 24b75c6f · Head (code): 28ec4307 · Result: verified

## Commands

| Command | Exit code |
|---|---|
| `bun run verify` | 0 (4016 pass, 1 skip, 0 fail; biome clean on 921 files; voxel determinism gate OK) |
| `bun run build` | 0 (vite build, 412 modules; chunk-size warning is pre-existing) |

Note: the first `bun run verify` run failed only on biome formatting of two
new/edited files; after collapsing three lines to the formatter's expected
output (`style(client)` commit), the re-run passed with no other changes.
The `smoke: RESULT fail (not an http(s) URL: file:///tmp/x)` line in the
verify log is pre-existing baseline noise, identical before this phase.

## What changed

- `apps/client/src/choreo-poses.ts` (new, P1.T1/P1.T2/P1.T3): pure
  stream-to-pose mapping. `poseForFrame` maps one `StreamFrame` onto exactly
  one pose (ko > crumple > flinch > crouch > none); `createPoseTracker`
  adds the step-counted 30-step crumple latch so a break holds until the
  poise window ends instead of decaying into a flinch; `poseAdjust` gives
  the driver's per-frame contribution (dx/dy/pitch/roll/display squash)
  with a distinct channel signature per pose, scaled by intensity and motion
  life. All intensities derive from the frame (hitstun remaining, startup
  progress) — no wall clock, no randomness.
- `apps/client/src/choreo-poses.test.ts` (new, P1.T3): 12 mapping tests
  (one per stream event kind plus priority rules), 6 tracker tests (latch,
  hold, extension, KO-wins, reset, same-step idempotence), 6 adjust tests
  (signatures, scaling, zero cases).
- `apps/client/src/fighter-driver.ts` (P1.T1/P1.T2): optional
  `pose`/`poseK` on `DriveFighter` (absent means untouched legacy path);
  the non-downed branch applies `poseAdjust` over the composed pose on the
  driver's own channels. The downed branch is unchanged, so KO still wins.
- `apps/client/src/fighter-driver.test.ts` (P1.T3): 4 driver tests proving
  no-pose leaves the composed pose untouched and each pose moves the body
  on its own channels (flinch back, crouch coil, crumple fold).
- `apps/client/src/dense-playback.ts` (deviation, see below): one
  `PoseTracker` per side, updated per step in `apply()`, reset in `reset()`.
  Caller-owned trackers keep dense playback's existing topple/react paths
  untouched.

## AC table

| AC | Verdict | Proof |
|---|---|---|
| AC-1 (landed hits show flinch) | pass | `choreo-poses.test.ts`: hit at 100 ms → flinch k=1, fading to 0.4 at 40 ms; driver test: flinch leans back (rotation.x < −0.1) and recoils (+0.12 x). Flinch active exactly while 0 < hitstunMs ≤ 100. |
| AC-2 (break shows crumple until window ends) | pass | Tracker test: break latched at step 50 crumples through hitstun 80 (step 70) and hitstun 0 (step 75), releases at step 80 (latch + 30 steps = 600 ms). Never reports flinch mid-hold. |
| AC-5 (startup crouch, no telegraph on active) | pass | `poseForFrame`: startup → crouch with intensity = phaseT/255; active → none; driver test: crouch dips to floor and coils +0.16 rad. |
| AC-10 (every event kind maps to a pose) | pass | 12 mapping tests cover idle, startup, active, recovery, plain hit, decaying hitstun, zero-damage stun, break, KO, pinned, startup+hit, startup+break — each asserts the one right pose and nothing else. |
| AC-11 (replay hashes equal main) | pass | Zero changes under `packages/sim/`; verify's battle-trace invariant run replays seed 20261111 to the same final hash `0xc579e9ae` with all 5 invariants ok. |

## Deviations

- `apps/client/src/dense-playback.ts` (+12 lines): the phase Touches name
  `dense-playback.ts` read-only, but feeding the trackers requires writing
  `c.pose`/`c.poseK` per step in `apply()` plus a `reset()` line — there is
  no other path from the stream to the driver. Minimal: one import, one
  tracker pair, three update lines, one reset line. No existing behaviour
  changed (default trackers report `none` until a pose event arrives; the
  existing topple/react paths are untouched).

## Notes (for Phase 2)

- Pose hooks: `DriveFighter.pose?: StreamPose` + `poseK?: number`, set by
  dense playback, rendered by the driver via `poseAdjust(pose, k, away,
  life)`. New poses only need a `StreamPose` arm, a mapping rule, and an
  adjust branch — the driver composes them over gait/breath/sway.
- Timing constants (mirrored, stream does not export them):
  `PLAIN_HITSTUN_MS = 100` (sim impulse.HITSTUN_MS — plain hitstun, never
  stacked, so anything above it can only be a break),
  `POISE_BREAK_MS = 600` over the stream's own `stepMs` = 30 steps
  (sim poise.POISE_BREAK_MS). If the sim retunes, these two lines move;
  the mapping shape (break >> plain) does not.
- Mapping table: `hp ≤ 0` → ko (topple path owns it); hitstun > 100 →
  crumple + latch; 0 < hitstun ≤ 100 → flinch k = hitstun/100; startup →
  crouch k = phaseT/255; active/recovery/pinned/idle → none.
- Known approximation: a tracker that joins mid-break (first sight is an
  already-decayed hitstun ≤ 100) reads flinch until a fresh break latches.
  Only affects mid-stream joins, never live playback.
- `poseAdjust` multiplies by motion `life`, so poses collapse to zero under
  reduced motion; Phase 4 owns the flash language that replaces them.
- Channel signatures today: crouch = dip + forward coil; flinch = recoil
  along away + lean-back; crumple = deep dip + forward fold + list +
  display squash. Dodge roll, knockback recoil, contact squash, telegraph
  wedge, and shader accents are Phases 2–4 and must reuse these channels,
  not add new geometry.
