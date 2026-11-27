# Review: Improve arena camera, lighting, and fighter readability

- **Track:** `20261127-arena-readability-pass`
- **Type:** feature
- **Branch:** `feat/20261127-arena-readability-pass`
- **Range:** `9bb6710de839a347720fdf53fb66b2df50bbce16..8cce85d2ddfd0cb9fc4525149504fce90f86f088`
- **Date:** 2026-11-27T19:58:04.1643135+11:00
- **Verdict:** `BLOCK`

## Summary

Strict review blocks on three High findings and one Medium finding. Settled action
framing, arena contrast, full HUD names, freeze lines, and the configured gate are
covered, but camera lifecycle containment, reduced-motion readability, the browser
evidence matrix, and real-smallest-ray separation coverage are not yet complete.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| Phase 1 framing/director/roster/module tests | pass — 58/0, 6,233 expect() | `verification/phase-1.md` |
| Phase 2 arena/HUD/framing/module tests | pass — 86/0, 6,226 expect() | `verification/phase-2.md` |
| Phase 4 framing/roster/module tests | pass — 65/0, 7,383 expect() | `verification/phase-4.md` |
| `bun run verify && bun run build` | pass — 4,623 pass / 1 skip / 0 fail; Biome and determinism clean | `verification/integrated.md` |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | pass — 5/0, 15 expect() | `verification/integrated.md` |
| Exhaustive whole-body containment probe | pass — 252,000 projections, 0 failures | `.conductor/evidence/arena-framing-exhaustive-result.json` |
| Reopened browser captures and consoles | pass with incomplete matrix — 2 messages, 0 errors/warnings per checked session | `verification/phase-3.md` |
| `git diff --check` | pass | reviewer + primary |

## Requirements

| ID | Status | Evidence / note |
| --- | --- | --- |
| FR-1 | partial | Settled containment and rest floor pass; transition clipping and reduced-motion wide shot fail the universal contract. |
| FR-2 | partial | Both styles retuned; lifecycle handoff and reduced-motion readability remain. |
| FR-3 | covered | Arena-only dressing/lighting/fog materially improve real captures. |
| FR-4 | partial | Corrected silhouettes read, but real-smallest-ray separation is not covered by committed fixtures. |
| FR-5 | covered | Full names wrap without ellipsis or control occlusion at all viewports. |
| FR-6 | partial | Dense/resize/finite checks pass; transition and reduced-motion findings remain. |
| FR-7 | partial | Cup cinematic and clean desktop/portrait establishing stills are missing. |
| NFR-1 | covered | No sim/bounds/state/save/balance/timing/outcome diff. |
| NFR-2 | covered | No audio diff. |
| NFR-3 | covered | Determinism byte-identical. |
| NFR-4 | covered | No ranch/shared lighting/post-processing/non-battle UI diff. |
| NFR-5 | covered | Full gate/module caps green; no dependency/lockfile/generated/harness diff. |
| AC-1 | partial | Measured rest floor passes in settled action; reduced-motion exception is unapproved. |
| AC-2 | partial | Settled legal positions and establishing corners pass; transition frame crops a fighter. |
| AC-3 | partial | Settled broadcast/cinematic pass; opening transition and reduced-motion size fail. |
| AC-4 | covered | Arena contrast improved; frozen surfaces unchanged. |
| AC-5 | covered | Full names visible; 39/37 metric is line-box overhang, not visible clipping. |
| AC-6 | partial | Dense/safe-area/finite checks pass; lifecycle and reduced-motion findings remain. |
| AC-7 | partial | Gate/GIF/consoles/freeze audit pass; required browser matrix incomplete. |

## Findings

### High

#### F1 — Establishing-to-action handoff can crop a fighter

`apps/client/src/camera/rig.ts:137-149,240-244` installs the destination FOV before
position/target reach the safe action pose. Corrected desktop `action-a` clips the
draconic fighter at the right edge; `action-b` onward is contained. The lifecycle
test skips early updates, so it misses this observable frame.

**Requirement:** FR-1, FR-2, FR-6, AC-2, AC-3, AC-6.

**Fix:** Cut to the first fully measured safe action pose, or interpolate FOV,
position, and target together while rejecting any intermediate pose that crops
body corners. Apply the same rule to cinematic handoff. Add a live-rig test from
`setMode("arena")` that checks the first and every subsequent update without
skipping transition frames.

### High

#### F2 — Reduced motion uses an unapproved below-floor wide shot

`apps/client/src/camera/rig.ts:229-239` persistently applies
`establishingFraming()` for reduced motion. The approved spec has no
reduced-motion/establishing exception to the 8% / 32 CSS-pixel rest floor. The
wide portrait composition renders measured small rays far below that floor.

**Requirement:** FR-1, FR-2, FR-4, AC-1, AC-3, AC-6.

**Fix:** Use tracked broadcast action composition for reduced motion while still
suppressing shake, flash, director choreography, and ornamental motion. Keep the
wide shot as a distinct establishing beat. Replace the wide-FOV reduced-motion
assertion with measured rest-floor and whole-body containment checks at all three
viewports, plus no-shake/no-director assertions.

### High

#### F3 — Required browser evidence matrix is incomplete

`verification/phase-3.md:361-376` contains cup broadcast only. There are no cup
cinematic captures at any viewport. Desktop/portrait establishing cells rely on
partial visuals plus projection JSON; only landscape has a clean all-four-corner
still.

**Requirement:** FR-7, AC-7.

**Fix:** Capture real cup cinematic action at `1440×900`, `393×852`, and
`852×393`, plus clean desktop/portrait stills showing all four painted corners.
Add them to the evidence matrix and recheck consoles.

### Medium

#### F4 — Advertised separation threshold is not enforced or fully regression-tested

`apps/client/src/scene-logic/framing.ts:312-331` returns the best readable candidate
even when no candidate reaches `MIN_CENTER_SEPARATION = 0.38`. Corrected real
profiles produce portrait gaps of 0.231 (ray/ray), 0.118 (ray/golem), and 0.261
(ray/draconic), while committed separation fixtures use seed-7 profiles and a
0.36 assertion threshold.

**Requirement:** FR-4, AC-3.

**Fix:** Add measured real-smallest-ray profiles to the separation fixtures and
assert the chosen composition against an explicit silhouette-readability
criterion. Enforce 0.38 where feasible or document/test a justified fallback for
geometrically impossible cases instead of silently returning below target.

## Overrides

None.

## Plan compliance

All four phase checkboxes and results say verified, with checkpoints `82f713ef`,
`986c7aeb`, `c6e2963d`, and `c1860f51`. Those labels are not dispositive under
strict review: P1.T1/P1.T2/P3.T1/P4.T1 remain partial because of F1–F4. P2.T1,
P2.T2, P3.T2, and P4.T2 pass. Freeze lines pass.

## Out of scope

No simulation, legal-bound, save/state, balance, audio, voxel, fighter-scale,
ranch/shared-lighting, dependency, generated-file, or committed browser-harness
change is proposed.

## Debt

None accepted. The landscape HUD 39/37 line-box metric and subdued-but-readable
landscape contrast are explicitly assessed as non-defects.

## Doc sync

Pre-review tech-stack note is committed. Post-review sync remains pending until
F1–F4 are resolved.

## History

| Round | Verdict | Fixed | Accepted | Open | Deferred |
| --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 0 | 4 | 0 |
