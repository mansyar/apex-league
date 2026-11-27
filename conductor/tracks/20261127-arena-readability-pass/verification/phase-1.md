# Phase 1 — Measurable framing and cinematic composition

> Status history: the first dispatch ended **blocked** on an unresolved product decision; that original report is preserved verbatim below. The owner resolved the decision and the phase was re-dispatched — see **## Resumed implementation** at the end for the current result.

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

---

## Resumed implementation

- **Owner decision (2026-11-27):** keep the universal 8% viewport-height / 32 CSS-pixel minimum at authored rest positions; use **tracked action framing** so every legal fighter position stays fully in frame; provide a **separate wide establishing shot** that contains all arena corners; corners are not required during action shots. Fighter/stage scale, sim mapping, legal bounds, reduced motion and ranch/shared-scene behavior stay frozen. The decision is recorded in `.conductor/runs/20261127-arena-readability-pass/phase-1-brief.md` and is not re-opened here.
- **Resume phase base:** `615b896502e89777a02802c383cd0e3a424262ef`
- **Implementation head:** `43c6ef1610a72b32be19927809902257f3363bc1` — `feat(client): add tracked arena framing and establishing shot` (six files, all inside Touches)
- **Result:** **blocked** — the required Phase 1 verification command passes (49/49), typecheck passes across all four workspaces, and every acceptance criterion below is implemented and tested. A style check was attempted with `bunx biome check ...` and was denied by the executor permission layer; per the phase rules it is reported as a blocker rather than retried or worked around. The primary must run `biome check` (as used by `bun run verify`) on the six committed files and hand back any findings. No full `bun run verify && bun run build` gate was run; that remains primary-owned.

### What changed

- `scene-logic/framing.ts` — pure `trackedActionFraming(aspect, a, b, pose, bodyHeight, look)` derives the minimum orbit radius in closed form from the live pair: for a camera at `T + R·d`, camera-space depth is `R - (P-T)·d` while right/up offsets are independent of `R`, so the frustum inequalities give a direct lower bound. Feet and head of both fighters are sampled at the tallest authored body (1.0 world). `establishingFraming(aspect)` exposes the wide shot's distance/lens.
- `camera/presets.ts` — `ACTION_FRAMING` (azimuth 1.35, elevation 0.25, targetY 0.85, margin 1.1, radius 3…60) and the existing `ARENA_FRAMING` repurposed as the wide establishing composition. `BASE_FOV` unchanged at 45.
- `camera/rig.ts` — the tracked dolly feeds broadcast and cinematic; all shot multipliers are treated as widening only (`Math.max(1, radiusMult)`) so a close-up cannot crop a legal-position fighter. Cinematic keeps its eased/cut intents, KO azimuth sweep and victim-biased looks. Reduced motion pins the wide shot, drops shake before it can move the camera, and ignores director intents. Resize re-derives the tracked dolly (or the pinned wide shot). Ranch orbit is untouched.
- `director.ts` — shot multipliers retuned to ≥1 while preserving the shot-grammar ordering pinned by existing tests; each intent now carries optional `focusA`/`focusB` ground positions from the live pair (optional so the existing five-field literal in `app/arena.ts` still type-checks).
- Tests pin three viewports (1440×900, 393×852, 852×393), three body extremes (0.48/0.72/1.0 world), mirrored rest positions, a 5×3 grid of legal pairs (both fighters' feet and heads), cinematic angle/look variants, all arena corners in the establishing shot, and rig lifecycle (reduced-motion pin, shake suppression, resize, broadcast↔cinematic switching, ranch return).

### Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Phase verification (exact command from brief) | `bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/director.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts` | 0 | 49 pass / 0 fail, 5970 expect() calls, 596 ms — includes typecheck of 243 files and the ≤12 KB client-module cap. |
| Workspace typecheck | `bun run check` | 0 | No type errors in voxel (214), sim (253), client (561) or server (185) files. |
| Style check | `bunx biome check apps/client/src/camera/presets.ts apps/client/src/camera/rig.ts apps/client/src/director.ts apps/client/src/director.test.ts apps/client/src/scene-logic/framing.ts apps/client/src/scene-logic/framing.test.ts` | n/a | Permission denied by the executor shell policy; not retried. Primary should run `biome check` on the committed files. |
| Git state | `git status --short`, `git rev-parse HEAD` | 0 | Only the six Touches files changed; head = `43c6ef16…`. |

### Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | ≥8% viewport height and ≥32 CSS px at authored rest positions, three viewports, body extremes, mirrored layouts | `framing.test.ts` → `every body extreme clears 8% and 32px at both mirrored rest positions` (real `PerspectiveCamera` projection) | pass |
| AC-2 | Every legal fighter position fully in frame in action; every arena corner in the establishing shot; sim mapping/bounds unchanged | `every legal fighter pair stays in frame in tracked action`; `cinematic angles and victim-biased looks still contain both fighters`; `the separate establishing composition contains every arena corner`; `dense-playback.test.ts` unchanged and green | pass |
| AC-3 | Both saved styles readable; resize, style switching, reduced motion intact | `arena camera rig — composition lifecycle`: wide pin with shake suppressed; broadcast↔cinematic transition; portrait resize still ≥8%/32px; ranch return restores `BASE_FOV` | pass |
| AC-6 | Lens/lifecycle bounded; dense effects unchanged | radius clamped to 3…60; FOV fixed at `BASE_FOV` for action; reduced-motion pin deterministic; dense-playback hash unchanged | pass |
| NFR-1 / NFR-4 / NFR-5 | Sim, ranch, module-size gates unchanged | `module-size.test.ts` green (all client modules ≤12 KB); no sim/scale/ranch file touched; `bun run check` green | pass |

### Failing-on-old / passing-on-new evidence

The committed tests depend on `trackedActionFraming`, `establishingFraming`, `ACTION_FRAMING` and the optional director focus fields, none of which exist at the resume base `615b896…`; they therefore fail to typecheck on the old implementation. Their numeric assertions also encode the resolved contract directly from real projection math: the original baseline recorded in this report (11 of 12 rest rows below threshold, portrait crab 1.93% / 16.4 px) fails the new rest-position test, while the new tracked dolly passes it (portrait crab clears 8% at rest). The separate establishing shot keeps the old full-arena corner guarantee without compromising action readability — which was the contradiction that blocked the first dispatch.

### Evidence paths

- `conductor/tracks/20261127-arena-readability-pass/verification/phase-1.md` (this report; blocked baseline preserved above)
- `.conductor/evidence/phase-1-baseline.test.ts`, `.conductor/evidence/phase-1-rig-probe.test.ts` (passing data stubs from the blocked dispatch)
- `.conductor/evidence/phase-1-action-search.test.ts`, `.conductor/evidence/phase-1-action-check.test.ts` (scratch projection/feasibility probes; passing stubs so unrestricted test discovery stays green)

### Deviations

None. All source and test edits are inside the six Touches paths; artifacts remain under `.conductor/evidence/` and this evidence file.

### Notes

- The wide shot is used as the arena entry composition and is pinned for reduced motion; it is not a third saved camera style.
- Shot multipliers are now all ≥1: safe cinematic "tightness" comes from look target and angle changes, since reducing distance below the tracked minimum would crop a fighter. The relative ordering that the existing shot-grammar tests pin is preserved.
- The `5×3` legal-position grid samples both extremes on X and Z plus the rest lane; the radius derivation itself is continuous, so intermediate positions are bounded by the same inequality.
- No full gate or build was run; style check remains with the primary per the blocked permission above.

---

## Rework 1

- **Trigger:** the primary re-ran the Phase 1 command (49/49 green) and scoped Biome, which found 5 errors and 1 warning in the committed implementation. Only those exact non-behavioral fixes were applied by hand; no `--write` command was retried and no behavior changed.
- **Fixes applied:**
  1. `scene-logic/framing.test.ts` — unused `rigBounds` parameter `aspect` renamed to `_aspect`.
  2. `camera/rig.ts` — `type ActionFramingPose` moved before `establishingFraming` in the `../scene-logic` import.
  3. `camera/rig.ts` — `const fresh = directorIntent !== null && performance.now() - intentAt < 400` collapsed onto one line.
  4. `director.test.ts` — `expect(nextShot(...).radiusMult).toBeGreaterThanOrEqual(1)` wrapped across lines.
  5. `scene-logic/framing.test.ts` — `ACTION_FRAMING` import moved before `createOrbitCamera`.
  6. `scene-logic/framing.test.ts` — `actionFrame(...)` call formatted one argument per line, the three cinematic pair arrays expanded to object-per-line form, and the `inside &&=` expression collapsed onto one line.
- **Commit:** `e2c9c4cb` — `style(client): format arena framing implementation` (3 files changed, 25 insertions, 12 deletions). Head is now `e2c9c4cb`; the implementation commit remains `43c6ef16…` and the evidence commit `ee64a329…`.
- **Verification re-run (exact command from brief):**

  | Command | Exit | Summary |
  | --- | --- | --- |
  | `bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/director.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts` | 0 | 49 pass / 0 fail, 5970 expect() calls, 589 ms |

- **Result:** Phase command still green. The primary should re-run scoped Biome to confirm all 5 errors and the warning are resolved; the executor cannot run that command (permission denied in the prior dispatch), so this phase remains **blocked** on that confirmation. No full gate or build was run. The evidence report change for this section is intentionally left uncommitted.

---

## Rework 2 — rendered-height acceptance and barrel pin

- **Trigger:** primary verification found two gaps: `scene-logic.test.ts` pinned `EXPECTED_EXPORTS` without `establishingFraming`/`trackedActionFraming`; and an independent real-Three probe measured normalized rendered baby-rig heights (ray 0.082, crab 0.299, draconic 0.382, tortoise 0.391, golem 0.522 world) that the old `TALLEST_BODY_WORLD = 1` framing could not make legible. This is the final allowed Phase 1 rework.
- **Commit:** `142f4b99` — `fix(client): frame rendered rig heights in tracked action` (11 files changed, 219 insertions, 42 deletions). Head is now `142f4b99`.
- **What changed:**
  - `roster.ts` measures each normalized rig's rendered `Box3` height after `bodyScaleFor` and exposes it as `Combatant.bodyHeight`; scale math, positions, stages and profiles are untouched.
  - The height feeds through `staging.ts` → `staging-director.ts` → `DirectorContext` → `CameraIntent` → `camera/rig.ts`, all as optional fields so the five-field intent literal in `app/arena.ts` stays valid. Missing/non-finite heights fall back conservatively.
  - `trackedActionFraming` now takes both fighters' rendered heights, aims at the midpoint of the bodies people see, and derives a telephoto lens (`tan ≤ 1.6 × smaller height`, capped by the authored 45° lens) so even the 0.082-world ray clears 8% / 32 px. Mixed-height casts bias the aim past the smaller fighter and put the camera on its side. Legal-position pairs still fit: when a spread-out pair would exceed the dolly cap the lens widens instead. The established wide shot and reduced-motion pin are unchanged.
  - `ACTION_FRAMING` now looks down the long axis with elevation 0; the narrower dolly range (`minRadius` 1.4) allows the close telephoto shot without changing any scale or sim bound.
  - `scene-logic.test.ts` pins the two new barrel exports; `roster.test.ts` proves `bodyHeight` equals the normalized rendered `Box3` height and is finite/positive across five archetypes × two stages; `director.test.ts` proves the heights ride along with each intent.
- **Verification:**

  | Command | Exit | Summary |
  | --- | --- | --- |
  | `bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts` | 0 | 58 pass / 0 fail, 6233 expect() calls, 5.24 s, 4× parallel |
  | `bun run check` | 0 | No type errors in voxel (214), sim (253), client (561), server (185) files |

- **Regression matrix:** five measured body heights (ray 0.082, crab 0.299, draconic 0.382, tortoise 0.391, golem 0.522), both mirror orders, three viewports (1440×900 / 393×852 / 852×393), real `PerspectiveCamera` projection; plus a mixed-height matrix (ray/golem and crab/draconic) and the existing 5×3 legal-position containment grid. All use projected feet/head pixels, not authored simulation cylinders.
- **Result:** the updated Phase 1 command and workspace typecheck pass. The full `bun run verify && bun run build` gate and scoped Biome re-check remain primary-owned and were not run here. This evidence section is intentionally left uncommitted for the primary.

## Primary verification — blocked at rework cap

- Scope matched the expanded 11-file Touches set plus the spec/plan clarification and evidence; no frozen simulation, save, audio, voxel, ranch, dependency, or generated-file surface changed.
- Primary reran the exact updated phase command: `58 pass / 0 fail / 6233 expect() calls`, exit 0.
- Primary scoped Biome failed on one formatter-only issue in `apps/client/src/camera/rig.ts:100`: the `targetY: look ? ... : ...` expression must be wrapped across three lines. `Checked 11 files`, `Found 1 error`, exit 1.
- This is the second Phase 1 rework attempt; the prior attempt resolved the original Biome diagnostics. The configured retry cap is exhausted, so the phase cannot receive a third rework and is not accepted.
- The mandatory full `bun run verify && bun run build` gate was not rerun because Biome is already red and the phase is blocked.
- Phase 1 state is `blocked`; no checkpoint, completion, PR, or merge action was created.

## Primary verification — owner-authorized correction and acceptance

- The owner explicitly authorized the primary to apply the remaining one-line Biome formatter correction after the rework cap was reached. The primary changed only `apps/client/src/camera/rig.ts:100`, wrapping the `targetY` ternary exactly as Biome requested, and committed it as `e90b7d40 style(client): wrap arena framing target expression`.
- Primary reran the exact updated phase command: `58 pass / 0 fail / 6233 expect() calls`, exit 0.
- Primary reran scoped Biome on all 11 Touches files: `Checked 11 files ... No fixes applied.`, exit 0.
- An independent real-Three projection probe used the measured normalized baby-rig heights (ray 0.082, crab 0.299, draconic 0.382, golem 0.522) in same-height and mixed-height pairs at 1440×900, 393×852, and 852×393. Every tested fighter cleared 8% viewport height and 32 CSS px; the tightest case was ray/ray at 8.44% and 33.2 CSS px in landscape.
- The mandatory `(bun run verify && bun run build)` gate passed with exit 0: clean typechecks in voxel 214, sim 253, server 185, client 561 files; `4613 pass / 1 skip / 0 fail`, `682365 expect() calls`, 4614 tests across 446 files; Biome clean on 1063 files; every archetype stage and all 5 prop digests byte-identical; Vite built `index-BZEEAg7t.js` at 1,112.80 kB with only the pre-existing chunk advisory.
- Scope remains the approved 11 client source/test files plus the owner-approved spec/plan clarification and evidence. No simulation, save, audio, voxel, ranch, dependency, or generated-file surface changed.
- Conclusion: the owner-authorized correction resolves the only remaining diagnostic. Phase 1 is ready for squash and acceptance.
