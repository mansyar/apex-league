# Integrated verification — 20261127-arena-readability-pass

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Date: 2026-11-27
Scope: Phases 1–3 (framing/composition, arena dressing + full HUD names,
browser proof + integrated gate).
Status: **blocked at Phase 3 visual acceptance**; Phases 1–2 are verified, but
independent image review found default-broadcast fighter occlusion and weak
arena contrast. AC-7 terminal registry/archive/review/PR steps are **partial by
design** and remain owned by the primary agent.

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
