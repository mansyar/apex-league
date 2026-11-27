# Integrated verification — 20261127-arena-readability-pass

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Date: 2026-11-27
Scope: Phases 1–4 (framing/composition, arena dressing + full HUD names,
browser proof + integrated gate, broadcast separation and arena contrast
correction).
Status: **verified after the Phase 4 correction and reopened Phase 3 proof**;
Phases 1–4 are verified, with documented Phase 3 limitations (landscape HUD
line-box delta, reduced-motion verdict timing, clean visual four-corner proof
at 852×393 only). AC-7 terminal registry/archive/review/PR steps are **partial
by design** and remain owned by the primary agent.

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
