# Phase 1 — Measurable framing and cinematic composition (BLOCKED)

- **Track:** `20261127-arena-readability-pass`
- **Phase:** 1 — Measurable framing and cinematic composition
- **Date:** 2026-11-27
- **Branch:** `feat/20261127-arena-readability-pass`
- **Base commit:** `8487e4c90ca867145a20a9f32945e377f0124714`
- **Head commit:** `8487e4c90ca867145a20a9f32945e377f0124714` (no code commit — blocked before implementation)
- **Result:** **blocked** — the Phase 1 contract is internally inconsistent: the required "≥8% viewport height AND ≥32 CSS px at authored rest positions, for all three viewports and body-size extremes" cannot be satisfied simultaneously with "every legal movement position and arena corner remains fully in frame" at portrait aspect 393/852 without an extreme fisheye camera. This is a product decision, so implementation stopped before retuning (per the brief's rule: stop and report `blocked` when a design decision is required).

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Baseline gate (exact Phase 1 verification command) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/director.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts` | 0 | 42 pass / 0 fail, 225 expect() calls, 2.53 s — baseline is green, so no pre-existing red gate is being hidden. |
| Failing baseline probe (real `THREE.PerspectiveCamera` + `Vector3.project`) | `bun test ./.conductor/evidence/phase-1-baseline.test.ts` | 1 | Genuine failing baseline recorded below: 11 of 12 rest-position rows miss ≥8% or ≥32 px; the probe asserted the contract, not constants. |
| Rig-height probe | `bun test ./.conductor/evidence/phase-1-rig-probe.test.ts` | 1 (5 s default timeout; values printed) | Rendered rigs are *shorter* than authored sim cylinders (draconic 0.382 vs 1.0 world), so a silhouette-based metric is stricter. |
| Git state | `git log --oneline --max-count=1` | 0 | Head = base = `8487e4c9`; no implementation commit. |

## Genuine failing baseline (exact output, 8487e4c9)

Viewports: desktop 1440×900 (aspect 1.600), portrait 393×852 (aspect 0.461), landscape 852×393 (aspect 2.168). Bodies are the authored `heightMm` extremes × `MM_TO_WORLD = 0.0008` (crab 600 mm → 0.48 world; draconic 1250 mm → 1.0 world). Rest x = ±`OPENING_GAP_MM` × 0.0008 = ±1.6 world. Framing is the current `ARENA_FRAMING` (radius 12.5, elevation 0.55, azimuth 0.12, targetY 0.9) with `arenaFramingAdjust` applied (radius 12.5 / FOV 45 wide; radius 18.75 / FOV 57 portrait).

```
desktop crab side=-1: 3.71% / 33.4px (radius=12.50 fov=45)
desktop crab side=1: 3.77% / 33.9px (radius=12.50 fov=45)
desktop draconic side=-1: 7.91% / 71.2px (radius=12.50 fov=45)
desktop draconic side=1: 8.03% / 72.3px (radius=12.50 fov=45)
portrait crab side=-1: 1.93% / 16.4px (radius=18.75 fov=57)
portrait crab side=1: 1.95% / 16.6px (radius=18.75 fov=57)
portrait draconic side=-1: 4.07% / 34.7px (radius=18.75 fov=57)
portrait draconic side=1: 4.12% / 35.1px (radius=18.75 fov=57)
landscape crab side=-1: 3.71% / 14.6px (radius=12.50 fov=45)
landscape crab side=1: 3.77% / 14.8px (radius=12.50 fov=45)
landscape draconic side=-1: 7.91% / 31.1px (radius=12.50 fov=45)
landscape draconic side=1: 8.03% / 31.6px (radius=12.50 fov=45)

expect(failures).toEqual([])  ->  11 failures (only desktop draconic side=+1 passes)
```

This is a real projection measurement: the probe builds a `PerspectiveCamera`, sets the orbit pose from the shipped presets, updates projection/matrices, projects feet and head through `Vector3.project`, and computes `|ΔNDC.y|/2` as the viewport-height fraction. It is not an assertion on constants.

## Why the Phase 1 contract cannot be satisfied as written

The painted/legal arena is ±3.2 (X) × ±2.4 (Z) world (`ARENA_BOUNDS` × `MM_TO_WORLD`, frozen). For a perspective camera whose frustum contains the full arena, the visible vertical world extent at the fighter's depth is at least `arenaWidth / aspect`. At portrait aspect `393/852 = 0.461` that is at least `6.4 / 0.461 ≈ 13.9` world units across the arena width (or `4.8 / 0.461 ≈ 10.4` if the shot looks straight down the short axis). A fighter of authored height `h` therefore cannot exceed `h / 13.9` (or `h / 10.4`) of viewport height:

| Body | h (world) | Absolute ceiling at portrait, full arena in frame | 8% (68 px) achievable? | 32 px achievable? |
| --- | --- | --- | --- | --- |
| crab (600 mm) | 0.48 | ≈ 2.6–3.5% | no | no (max ≈ 22–24 px) |
| default (900 mm) | 0.72 | ≈ 3.9–5.9% | no | yes only with aggressive retune |
| draconic (1250 mm) | 1.0 | ≈ 6.9–8.1% | only at the extreme bound | yes |

An exhaustive numerical search (real look-at + perspective projection, all four arena corners constrained to NDC ∈ [-1, 1]) over camera radius 4–22, FOV 25–80°, elevation 0.02–0.7 rad, targetY 0–2, azimuth 0–π found the maximum achievable fractions at portrait: **3.95% for h = 0.72** and **2.58% for h = 0.48** with a camera outside the arena and a sane lens. Widening the search to FOV 150° and a camera just inside the arena (`P = (-1.5, 2.5, 0)`, `T = (-2, 0, 0)`) reaches 14%, but that is an extreme fisheye pointed away from the pair — not a broadcast or cinematic shot this track is allowed to invent without a product decision.

Additional numeric check: at portrait, fitting the arena width requires `R · tan(FOV/2) ≥ 3.2 / 0.461 ≈ 6.94`. The current build uses `18.75 · tan(28.5°) = 10.18`. Even reducing to the geometric limit (a 1.47× improvement) lifts the smallest body from 16.4 px to only ≈ 24 px — still below the required 32 px.

Rendered rigs make this stricter: measured baby-stage rig heights after `bodyScaleFor` are draconic 0.382, tortoise 0.391, crab 0.299, ray 0.082, golem 0.522 world — all well below the authored sim cylinder heights.

Therefore the two clauses cannot both hold. A decision is needed on which invariant to relax:

1. **Relax the 8% / 32 px threshold on portrait broadcast** (e.g. keep full-arena framing everywhere and pin desktop/landscape ≥8%, portrait ≥32 px for the default body only), or
2. **Relax "all arena corners in frame"** for a tighter, tracked action camera that reaches 8% at rest (and keep a separate wide establishing shot for the corners), or
3. **Apply the 8% / 32 px metric to the cinematic close-up only** while broadcast keeps full-arena framing with a lower, documented floor.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Projection/table tests pin 8% viewport height and 32 CSS px at rest for all viewports, body extremes, mirror layouts | Failing baseline probe above: 11/12 rows miss the threshold; geometric proof shows portrait cannot meet it with full arena in frame | blocked |
| AC-2 | All legal positions and arena corners in frame; sim mapping/bounds unchanged | Existing `framing.test.ts` corner test passes on baseline (gate 42/42); no retune attempted, so no regression introduced | not started |
| AC-3 | Broadcast and cinematic readable; style switching, resize, reduced motion intact | No code changed; existing behavior preserved | not started |
| AC-6 | Lens/lifecycle/reduced-motion/dense effects finite and bounded | No code changed; existing behavior preserved | not started |
| NFR-1 / NFR-4 / NFR-5 | Sim, ranch, module-size gates unchanged | Baseline gate green (42/42); no source file edited | preserved |

## Evidence paths

- `conductor/tracks/20261127-arena-readability-pass/verification/phase-1.md` (this report)
- `.conductor/evidence/phase-1-baseline.test.ts` (passing data stub; original failing probe output transcribed above)
- `.conductor/evidence/phase-1-rig-probe.test.ts` (passing data stub; measured rig heights)

The scratch probes were converted to passing data stubs because the unrestricted `bun test` discovery used by `bun run verify` would otherwise run them and fail the full gate. They are artifacts, not part of the phase gate.

## Deviations

None in source. Two scratch artifacts were added under `.conductor/evidence/` (permitted by the brief) and then neutralised to passing stubs so they cannot break gate discovery.

## Notes

- No implementation was started because choosing which invariant to relax is a product/design decision reserved to the primary agent.
- The exact Phase 1 verification command was run on the untouched baseline and passed (42/42). No final "verified" claim is made.
- No code commit was created; head equals the phase base. The primary can re-dispatch Phase 1 with a resolved threshold policy.

## Primary verification

- Scope check: `git diff --name-only 8487e4c90ca867145a20a9f32945e377f0124714..HEAD` is empty, `git log --oneline 8487e4c9..HEAD` is empty, and HEAD equals the phase base. No production, test, or Conductor state file outside the evidence report changed.
- The primary independently re-ran the exact phase command: `42 pass / 0 fail / 225 expect() calls`, exit 0. This confirms the blocker is not a pre-existing test failure.
- The projection math and full-arena geometric bound were inspected: portrait aspect 393/852 cannot simultaneously keep the full 6.4-unit arena width in frame and project a 0.48–1.0-unit fighter to 8% viewport height. The current measured baseline and the geometric ceiling support the same conclusion.
- Result remains **blocked**, not verified. Resolving AC-1 versus AC-2 requires an owner-approved threshold/framing policy before implementation can continue.
