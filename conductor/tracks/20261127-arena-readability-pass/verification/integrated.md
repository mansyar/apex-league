# Integrated verification — 20261127-arena-readability-pass

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Date: 2026-11-27
Scope: Phases 1–4 (framing/composition, arena dressing + full HUD names,
browser proof + integrated gate, broadcast separation and arena contrast
correction).
Status: **verified after the Phase 4 correction, reopened Phase 3 proof and the
2026-11-27 R1 strict-review fixes**; Phases 1–4 are verified and Round 1 findings
F1–F4 are resolved (see the R1 section at the end). The remaining non-defects
are the landscape 39/37 HUD line-box delta without visible clipping and the
subdued landscape contrast. AC-7 terminal registry/archive/review/PR steps are
**partial by design** and remain owned by the primary agent.

This report consolidates the already-recorded phase evidence. It does not
replace the phase reports, which hold the exact commands, outputs and paths:

- `conductor/tracks/20261127-arena-readability-pass/verification/phase-1.md`
- `conductor/tracks/20261127-arena-readability-pass/verification/phase-2.md`
- `conductor/tracks/20261127-arena-readability-pass/verification/phase-3.md`

Both Phase 3 reports are intentionally uncommitted for the primary.

## Phase 1 — measurable framing and cinematic composition

- Owner decision resolved the original contract contradiction: keep the 8%
  viewport-height / 32 CSS px minimum at authored rest positions, use
  **tracked action framing** for every legal fighter position, and use a
  **separate wide establishing shot** for all arena corners. Fighter/stage
  scale, sim mapping/bounds, reduced motion and ranch behavior stayed frozen.
- Implementation commits: `43c6ef16` (tracked framing + establishing shot),
  `e2c9c4cb` (format), `142f4b99` (rendered rig heights + barrel pin),
  `e90b7d40` (owner-authorized one-line Biome correction).
- Final exact phase command:
  `bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts`
  → exit 0, 58 pass / 0 fail / 6233 expect() calls; `bun run check` green on
  voxel 214, sim 253, client 561, server 185 files.
- Independently probed normalized baby-rig heights: ray 0.082, crab 0.299,
  draconic 0.382, tortoise 0.391, golem 0.522 world units; tightest projected
  case ray/ray landscape 8.44% / 33.2 CSS px. Broadcast/cinematic switching,
  resize, reduced-motion pin and shake suppression are pinned by tests.
- Result: **verified** after owner-authorized correction.

## Phase 2 — arena dressing and full HUD names

- TDD: red commit `61d4021c` added three `.battle-hud-name` tests (84 pass /
  2 fail); implementation commit `3cc6cb59` fixed CSS-only truncation.
- `apps/client/src/arena.ts` changed palette/lighting/fog values only; geometry,
  bounds, lifecycle, disposal, scale, shared scene setup, audio and voxel are
  untouched. `apps/client/src/battle-hud.css` removed nowrap/clipping/ellipsis
  and added wrapping/shrink/right-plate alignment; `battleHud.ts` unchanged.
- Exact phase command (five test files including `module-size.test.ts`) →
  exit 0, 86 pass / 0 fail / 6226 expect() calls; `bun run check` green.
- Result: **verified**; visual proof explicitly deferred to Phase 3.

## Phase 3 — browser proof and integrated gate

- Evidence-only: no production, CSS, test, generator, schema, sim, save, audio
  or Conductor state edits. Saves seeded only through real sim exports.
- Full 3-viewport × 6-state matrix captured at 1440×900, 393×852 and 852×393:
  ranch baseline, wide establishing/corner proof, spar broadcast action, spar
  cinematic action, real cup battle (day-7 `startCupSession` via real UI), and
  reduced-motion stable arena. Long names and mirrored plates were exercised in
  the real flows; all HUD names were full text with `clip`/`normal`/`anywhere`
  and `scrollWidth == clientWidth`, no ellipsis.
- Overflow: `document.documentElement.scrollWidth == innerWidth` at every
  capture (1440, 393, 852). HUD plates/controls stayed inside the viewport;
  off-canvas portrait ranch drawers are intentional collapsed UI.
- Fighter readability re-measured in-browser with real `buildSpot` rig heights
  and live `trackedActionFraming`: worst case 8.44% / 33.2 px; all sampled
  bodies centered; establishing corners NDC-in-frame at all three viewports.
- Camera lifecycle: broadcast/cinematic via real saved style, resize per
  viewport, reduced-motion wide pin with vignette 0 and no flash; dense beats
  up to vignette 0.81 with no errors. Stills, one WebM and a suggested ffmpeg
  GIF command are inventoried in `phase-3.md`.
- Consoles: `Total messages: 2 (Errors: 0, Warnings: 0)` for each of the three
  sessions; `playwright-cli list` → `(no browsers)` after `close-all`; Vite left
  running.
- Gate: first `bun run verify && bun run build` attempt timed out in one cup
  test while browsers were open (4615 pass / 1 skip / 1 fail); after closing
  browsers the exact command was rerun with exit 0 — **4616 pass / 1 skip /
  0 fail**, 682379 expect() calls, 4617 tests / 446 files, Biome clean on
  1063 files, voxel determinism byte-identical, Vite `index-BpBJx2Fi.js`
  1,112.80 kB. `bun test --check --parallel=4 --timeout 120000
  apps/client/src/module-size.test.ts` → 5 pass / 0 fail / 15 expect() calls.
- Result: **blocked** — automated checks pass, but independent visual review
  confirms default-broadcast fighter occlusion and insufficient arena contrast.
  The GIF was not transcoded because the phase is not accepted.

## Acceptance-criteria roll-up

| Criterion | Verdict | Source |
| --- | --- | --- |
| AC-1 — 8% / 32 px at rest, three viewports, body extremes, mirrored | pass | Phase 1 tests + Phase 3 browser projection measurement |
| AC-2 — legal positions in frame; establishing corners | pass | Phase 1 tests + Phase 3 NDC/CSS corner containment and reduced-mode stills |
| AC-3 — broadcast/cinematic readable; resize, style switch, reduced motion | blocked | Phase 1 lifecycle tests pass, but independent Phase 3 image review shows default broadcast can occlude one fighter. |
| AC-4 — arena contrast and fighter silhouette | blocked | Phase 2 palette/lighting changes are present, but real captures remain dim/low-contrast and broadcast frames can hide one body. |
| AC-5 — full HUD names, no clipping/ellipsis | pass | Phase 2 CSS tests + Phase 3 computed styles and OCR |
| AC-6 — lens/lifecycle/reduced-motion/dense effects bounded and clean | pass with finding | Phase 1 tests + Phase 3 dense/vignette and console results |
| AC-7 — full gate + terminal workflow | partial | Full gate pass; registry/archive/review/PR terminal proof owner-owned (see below) |
| NFR-1..NFR-5 — frozen surfaces, determinism, module caps, build | pass | Phase 1/2 commands + final full gate |

## AC-7 terminal proof — partial by design

The phase executors were prohibited from editing `metadata.json`, `tracks.md`,
`conductor/index.md`, `plan.md`, `spec.md`, `review.md`, `pr.md`, and from
running push/merge/rebase/reset/checkout/tag/stash or PR commands. Therefore:

- **Registry/archive:** not updated by these phases — primary-owned.
- **Conductor review:** not run by these phases — primary-owned.
- **PR / merge:** not opened, pushed or merged by these phases — primary-owned.

The code and verification evidence needed for those terminal actions is
complete and green; the workflow steps themselves are intentionally left to
the primary agent.

## Scope and deviations

- No generated file or lockfile was modified; no denial from the permission
  layer occurred in Phase 3. No questions, web use or subagents were used.
- Phase 3 deviations (Date.now pin for deterministic spar rival, browser
  `__p3mode` bookkeeping, no DOM clicks, landscape line-box metric, landscape
  corner-proof limitation, gate retry, GIF left to primary) are detailed in
  `phase-3.md`.
- Both Phase 3 evidence files remain uncommitted for the primary.

---

## Reopened after Phase 4 (2026-11-27)

Phase 3 was reopened after Phase 4 (`c6e2963d`) corrected the two visual
blockers recorded above: default-broadcast fighters now separate through the
measured-azimuth search in `trackedActionFraming`, and the arena paint/lighting
contrast was retuned. This reopened pass is evidence-only, preserves all earlier
failed captures, and writes every new visual with a `corrected-` prefix. Phase
base was `795711f8356d14ea58cc67d41f27a78e8b4d2ce5`; head was unchanged.

### Phase 4 correction (consolidated)

- Added measured `bodyRadius` after frozen footprint normalization; the 9-arg
  `trackedActionFraming(aspect, a, b, pose, heightA, heightB, look, bodyRadiusA,
  bodyRadiusB)` searches three-quarter azimuth offsets
  (`SEPARATION_OFFSETS = [0,0.02,0.04,0.06,0.08,0.12,0.18,0.26,0.4,0.55]`)
  for centre separation `MIN_CENTER_SEPARATION = 0.38` while preserving
  `READABILITY_FLOOR = 0.082`.
- Whole-body footprint-corner projection tests and arena-only contrast retune
  were added; reduced motion remains the approved pinning exception.
- Phase 4 verification is green (full gate 4623 pass / 1 skip / 0 fail), so the
  former FR-3/AC-3 and FR-4/AC-4 blockers are resolved in code.

### Reopened Phase 3 proof

- Real sim casts only: a `spark_ray` player created with
  `createCreatureFrom(getSpecies('spark_ray'), 12345)`, renamed `Sunbeam Comet`,
  and a real `makeExhibition` rival pinned by `Date.now = 2147483648` to
  `Ember Drake` seed 0. Camera/motion via `setArenaCamera` / `setReducedMotion`
  + `saveGame` + reload. No DOM `.click()` workaround.
- Full 3-viewport × 6-state matrix repeated at 1440×900, 393×852 and 852×393:
  ranch baseline, establishing/corner proof, spar broadcast, spar cinematic,
  real day-7 cup battle and reduced-motion stable arena. All new stills are
  `corrected-`-prefixed and inventoried in `phase-3.md`.
- HUD names were full in every capture: `clip` / `normal` / `anywhere`,
  `scrollWidth == clientWidth`, no ellipsis. `scrollWidth == innerWidth` at all
  viewports; plates and controls stayed in bounds. Landscape reports a 2 px
  line-box delta (39/37) with full OCR text and no visible clipping.
- Projection remeasured with real rig heights **and radii** through the new
  9-arg framing function: worst case ray/ray landscape 8.20% / 32.2 px; all
  sampled bodies `inFrame`; all four establishing corners NDC-in-frame at every
  viewport. Full data in `projection-measurement-corrected.json`.
- Vision review: corrected broadcast entry and cinematic action beats show two
  separate fighters with brighter arena paint; landscape cup entry shows all
  four inner-square corners; reduced frames have vignette 0 and a verdict
  banner from entry, proving pinning/no-flash rather than clean live action.
- Corrected WebM: `corrected-arena-action-desktop-1440x900.webm` (Ember Drake
  cast, stable HUD, dense vignette peaks 0.81 / 0.702206 / 0.63385,
  `errors: []`). GIF transcode command and ≤10 MB / ≤10 fps target are recorded
  in `phase-3.md` and left to the primary.
- Consoles: `Total messages: 2 (Errors: 0, Warnings: 0)` for each checked
  session; every capture script returned `errors: []`.
- Final exact gate with all browsers closed: `bun run verify && bun run build`
  → exit 0, **4623 pass / 1 skip / 0 fail**, 683529 expect() calls, 4624 tests
  / 446 files / 93.74s, Biome clean on 1063 files, voxel determinism
  byte-identical, Vite `index-DhAc5cQZ.js` 1,114.41 kB (gzip 309.22 kB).
  `bun test --check --parallel=4 --timeout 120000
  apps/client/src/module-size.test.ts` → 5 pass / 0 fail / 15 expect() calls.

### Reopened acceptance-criteria roll-up

| Criterion | Verdict | Source |
| --- | --- | --- |
| AC-1 — 8% / 32 px at rest, three viewports, body extremes, mirrored | pass | Phase 1 + corrected 9-arg projection, worst 8.20% / 32.2 px |
| AC-2 — legal positions in frame; establishing corners | pass with finding | Corrected NDC containment at all viewports; clean visual four corners at 852×393 only |
| AC-3 — broadcast/cinematic readable; resize, style switch, reduced motion | pass | Phase 4 correction + corrected broadcast/cinematic stills with separated fighters |
| AC-4 — arena contrast and fighter silhouette | pass with finding | Brighter corrected stills and separated entry/action bodies; later melee convergence can still occlude |
| AC-5 — full HUD names, no clipping/ellipsis | pass | Phase 2 CSS tests + corrected computed styles and OCR |
| AC-6 — lens/lifecycle/reduced-motion/dense effects bounded and clean | pass with finding | Dense ≤0.81, no errors, reduced pin; 39/37 landscape line-box delta |
| AC-7 — full gate + terminal workflow | gate pass; terminal partial | Final gate 4623/0; registry/archive/review/PR owner-owned |
| NFR-1..NFR-5 — frozen surfaces, determinism, module caps, build | pass | Scope audit + final full gate |

### AC-7 terminal proof — still partial by design

The reopened phase again made no Conductor-state or PR changes. Registry,
archive, Conductor review, PR creation/push/merge remain owned by the primary
agent; the evidence required for those steps is green.

### Reopened scope and notes

- No production code, CSS, tests, generator, schema, sim, save, audio, plan,
  metadata, roadmap, product docs, review, PR, generated file or lockfile was
  edited in the reopened phase. No commits were created; head remains
  `795711f8`.
- No questions, web use or subagents were used. No permission denial occurred.
  Some vision calls returned HTTP 429 rate limits and were not tight-loop
  retried.
- `playwright-cli close-all` preceded the gate (`playwright-cli list` →
  `(no browsers)`); Vite was left running.
- `verification/phase-3.md` and this `verification/integrated.md` are the only
  working-tree changes and remain uncommitted for the primary.

## Independent primary verification (reopened pass)

**Result: verified with recorded, non-blocking visual findings.**

- Primary image review covered corrected desktop/portrait/landscape broadcast
  contact sheets, cinematic desktop frames, the landscape cup establishing frame,
  and reduced-motion portrait. Settled desktop broadcast `action-b`…`action-f`,
  portrait broadcast, landscape broadcast, and desktop cinematic all show two
  distinct fighter bodies. The initial desktop `action-a` transition can clip the
  draconic fighter at the right edge before the tracked camera settles; this is
  recorded explicitly for review.
- Arena contrast is materially improved in real captures: floor lines and both
  fighter silhouettes read against the background. Landscape remains visually
  subdued but readable. Reduced-motion portrait is stable/wide with vignette 0;
  its immediate victory banner is documented rather than used as action proof.
- Primary re-ran `(bun run verify && bun run build)` → exit 0: clean typechecks;
  **4,623 pass / 1 skip / 0 fail**, 683,529 expect() calls, 4,624 tests / 446
  files; Biome clean on 1,063 files; all archetype stages and 5 prop digests
  byte-identical; Vite `index-DhAc5cQZ.js` 1,114.41 kB, only the existing chunk
  advisory.
- Independent exhaustive probe result:
  `.conductor/evidence/arena-framing-exhaustive-result.json` — **252,000
  whole-body corner projections, 0 failures** across five body profiles, all
  15×15 legal position pairs, and all three viewports.
- Corrected browser projection: tightest rest case ray/ray landscape
  **8.20% / 32.2 CSS px**; all four establishing corners NDC-in-frame.
- Primary produced the required GIF from the corrected WebM after trimming the
  loading/ranch preamble:
  `.conductor/media/20261127-arena-readability-pass/arena-readability.gif` —
  960×540, 8 fps, 64 frames, 8.01 s, 5,077,671 bytes. It is gitignored and will
  be attached to the PR, not committed.
- Scope check before primary edits: phase range `795711f8..HEAD` had no commits
  or source changes; only the two evidence files are modified and
  `git diff --check` exits 0.

Review findings to carry forward: transient desktop broadcast camera-settling
clip, landscape 39/37 HUD line-box delta without visible clipping, and no clean
desktop/portrait all-four-corner still (projection proof plus partial visuals).
These do not reverse the corrected settled-action separation, full HUD names,
or improved arena contrast.

## Doc sync

- `conductor/tech-stack.md` records the measured height/radius feed, tracked
  action framing, separate establishing shot, reduced-motion exception, arena
  contrast retune, and full-name HUD layout.
- `conductor/product.md`, `conductor/product-guidelines.md`, and
  `conductor/workflow.md` need no change: the owner's framing decision and
  presentation-only freeze are already captured in the approved spec.
- RM-14 remains linked until the completion commit retires it.

## Review fixes R1 (2026-11-27) — F1–F4 resolved

Phase base `38605961`, branch `feat/20261127-arena-readability-pass`. Round 1
`BLOCK` findings were all fixed with no override and no spec weakening;
requirement IDs remain FR-1..FR-7, NFR-1..NFR-5, AC-1..AC-7. No R1 commits were
made by the phase executor and all evidence files are left uncommitted.

- **F1 (camera handoff):** `rig.ts` now cuts pose and FOV together on
  establishing→action, cinematic handoff, style switches, resize, reduced-motion
  transitions and >0.5-unit focus jumps. New live-rig tests check the first and
  every update from `rig.setMode("arena")` at 1440×900, 393×852 and 852×393,
  verifying all measured body corners stay inside NDC ±1. Red evidence:
  `Received: 1.0896512401635225` / `1.0289891048171926` (right-edge crop).
- **F2 (reduced motion):** the unapproved wide-shot exception and the old
  `establishingFraming(aspect).fov` assertion were removed. Reduced motion now
  tracks the readable broadcast action composition with the 8% / 32 CSS-pixel
  floor, containment, no shake and no director-driven pose at all three
  viewports. Red evidence: camera-position delta `13.465713020368288`.
- **F3 (browser proof):** cup cinematic action at all three viewports captured
  with real sim-saved day-7 cups (`r1-cup-cinematic-*`, `r1-` prefix, prior
  `corrected-*` artifacts preserved). Module-measured action poses keep both
  bodies in frame: 1440×900 ray `0.223214`/`200.893` px, drake
  `0.336828`/`303.145` px; 393×852 ray `0.093003`/`79.239` px, drake
  `0.235097`/`200.303` px; 852×393 ray `0.223214`/`87.723` px, drake
  `0.336828`/`132.373` px. Clean desktop and portrait four-corner stills
  (`r1-wide-clean-1440x900.png`, `r1-wide-clean-393x852.png`) were rendered in
  the real browser from the production arena/framing modules because the live
  app's first arena frame is now an action cut; all four corner NDC values are
  recorded in `phase-3.md`. Console totals: `2 messages, 0 errors, 0 warnings`
  per session; every capture `errors:[]`; `playwright-cli close-all` →
  `(no browsers)` before the primary gate.
- **F4 (separation):** `MIN_CENTER_SEPARATION` is renamed and documented as
  `TARGET_CENTER_SEPARATION`; an explicit `MIN_DISTINCT_SEPARATION = 0.1`
  fallback keeps silhouettes distinct when 0.38 is geometrically impossible.
  Failing-first fixtures use the authoritative measured ray `0.073514/0.136`,
  draconic `0.364/0.208` and golem `0.450545/0.236` rigs and assert
  containment, floor, and distinct separation at 393×852 for ray/ray,
  ray/golem and ray/draconic.

Exact R1 phase command (exit 0):
`bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts`
→ **68 pass / 0 fail**, 7900 expect() calls, 6 files, 10.10 s. The scoped Biome
check was permission-denied for this executor and is primary-owned; the full
`bun run verify && bun run build` gate was not re-run here.

Updated roll-up: FR-1, FR-2, FR-4, FR-6 and FR-7 (and AC-1, AC-2, AC-3, AC-6,
AC-7) are no longer only partially covered — the lifecycle, measured-floor and
separation gaps are closed. Prior Phase 1–4 and reopened-pass results stand
unchanged; `AC-7` terminal steps remain primary-owned. Details and verbatim
outputs are in `verification/phase-R1.md` and `verification/phase-3.md`.

## Rework 2 — primary visual acceptance corrections (2026-11-27)

Independent image review of the Rework 1 cup-cinematic stills found live crops
that the static fixtures missed: portrait `action-a/b/c` clipped upper bodies
and landscape `action-a/b/c` clipped the top against the HUD. No override was
requested, the approved spec was not weakened, and requirement IDs remain
FR-1..FR-7, NFR-1..NFR-5, AC-1..AC-7. No commits were made; all evidence stays
uncommitted for the primary.

Corrections, within the same R1 allowed files:

- `rig.ts`: removed all arena pose easing; broadcast and cinematic updates
  hard-cut the current measured pose and lens together. Arena shake is reset
  so it cannot move the camera outside the safe pose. Arena entry holds a
  deterministic **750 ms full-motion wide establishing beat** containing both
  bodies; reduced motion skips it and uses readable broadcast action
  immediately. After the beat, the cut is immediate; style switches and resize
  cut as well. Cinematic uses victim look only, zero azimuth delta, zero
  elevation and no director `radiusMult` zoom.
- `framing.ts`: `READABILITY_LENS_FACTOR = 2.4`; fallback prefers the largest
  absolute screen gap among readable, distinct candidates; aim height is
  `min(pose.targetY, max(smaller, larger / 2))` so taller bodies stay below the
  HUD. `TARGET_CENTER_SEPARATION = 0.38` and `MIN_DISTINCT_SEPARATION = 0.1`
  remain unchanged and documented; no new runtime exports.
- `framing.test.ts`: new failing-first R2 block moves both fighters every
  frame, asserts the exact safe pose after the establishing beat, checks the
  floor during cinematic action, checks reduced motion skips the beat, and
  rejects any intermediate easing crop at all three viewports.

Failing-first red evidence (exact phase command): `68 pass / 4 fail`,
`8554 expect() calls`; establishing FOV `45` vs `13.416886490521344`, floor
`0.06084677237984924` vs `0.08`, pose distance `2.8` vs `< 0.000001`. Green
final evidence: `72 pass / 0 fail`, `9127 expect() calls`, `Ran 72 tests across
6 files. [11.44s]`, exit 0. The scoped Biome command was attempted and again
permission-denied for this executor; the full gate was not run.

Fresh real-browser `r2-` evidence at 1440×900, 393×852 and 852×393: cup
cinematic action beats `r2-cup-cinematic-action-{a,b,c,d}-<tag>.png`, with
final tracked poses `fov:20.011849046899478` and targetY `0.1813335`; ray /
drake fractions `0.148810`/`133.929` px and `0.224552`/`202.097` px at
1440×900, `0.099896`/`85.112` px and `0.194663`/`165.853` px at 393×852,
`0.148810`/`58.482` px and `0.224552`/`88.249` px at 852×393. All measured
body boxes were `inFrame:true`; all four wide-shot corners remained in frame.
Real live-app establishing beats `r2-establishing-1440x900.png` and
`r2-establishing-393x852.png` were captured inside the new 750 ms beat and
visually show all four painted arena corners; no synthetic render is offered
as final proof. Console totals were `Total messages: 2 (Errors: 0, Warnings: 0)`
per session, every `run-code` returned `errors:[]`, and
`playwright-cli close-all` left `(no browsers)`. Honest residual: the battle
HUD still overlays the upper arena (part of the drake's head in landscape) and
the ray's wings overlap the drake's legs in portrait, though both bodies stay
inside the viewport and no viewport-edge crop remains in the inspected beats.
Details, exact paths and measurements are in `verification/phase-R1.md` and
`verification/phase-3.md`.

## Corrective pass — animated-envelope containment (2026-11-28, primary)

Independent vision review of the Rework 2 `r2-` stills found a residual the
static fixtures missed: live fighters rise above their rest boxes every beat
(posture windup rise, recoil lift, gait, breath), so portrait beats clipped
head/horn tips at the viewport top edge even though every static projection
was green. Root cause: the camera solves from rest boxes, which do not
envelop animated poses. The day-7 cup drake's kit (`spark`, `flame_charge`,
`cinder_shot`, `blaze_bolt`) carries no `cinder_dive`, so the 2.2 lift arc is
excluded by construction — only sub-0.35 excursion had to be covered.

Correction, inside the R1 allowed files (`framing.ts` only):

- `ANIM_HEIGHT_PAD = 0.2` extends ONLY the containment envelope (feet at 0
  through head plus pad); the readability fraction stays pinned to measured
  rest height, so the 8%/32 px promise keeps its rest-position meaning. An
  abandoned `0.35` first attempt broke the portrait small-ray floor (`0.057`
  < `0.08`) and collapsed separation (`7.17e-16` < `0.1`) — recorded red, then
  retuned to `0.2` with balanced padded aim
  (`min(pose.targetY, max(smaller + pad/2, (larger + pad)/2))`).
- `ANIM_RADIUS_PAD = 0`: lunges already reach the solver through live focus
  positions. Comment-only trims kept `framing.ts` at 11691 B ≤ 12288 B cap.

Verification at final code: exact R1 phase command
`72 pass / 0 fail / 9127 expect()` (exit 0), scoped Biome clean, fresh
`bun run verify` exit 0 + `bun run build` exit 0 with full-suite totals
**4630 pass / 1 skip / 0 fail**, `685273 expect()` calls, 4631 tests / 446
files, all seed-42 determinism digests byte-identical. Fresh real-browser
`r3-` matrix (same day-7 cup seed, all viewports): static NDC has all corners
and both rest body boxes in frame with zero console/page errors, and
independent vision review of all 12 final action stills reports zero
viewport-edge clip, heads clear of HUD/scenery, fighters distinguishable;
establishing stills show all four painted corners at every viewport. Honest
residuals: transient lunge beats can stack the fighters visually (authored
choreography, both bodies in frame) and the 852×393 establishing still catches
the arena fade mid-transition with partial HUD-panel overlap — disclosed, not
crop. Full numbers, red evidence and still paths are in
`verification/phase-R1.md` (corrective appendix) and `verification/phase-3.md`.
