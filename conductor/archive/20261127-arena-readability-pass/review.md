# Review: Improve arena camera, lighting, and fighter readability

- **Track:** `20261127-arena-readability-pass`
- **Type:** feature
- **Branch:** `feat/20261127-arena-readability-pass`
- **Range:** `9bb6710de839a347720fdf53fb66b2df50bbce16..7b3085f4`
- **Date:** 2026-11-28
- **Verdict:** `PASS`
- **Round:** 2 (delta review of the R1 corrective pass)

## Summary

Round 1 `BLOCK` (F1–F4) is fully closed by the corrective pass: every arena
action update hard-cuts pose and FOV together, reduced motion tracks readable
broadcast action, a fresh final-code r3 browser matrix proves 12/12 action
beats with zero viewport-edge clip, and the 0.38 target now has an explicit
tested 0.1 fallback on measured real-smallest-ray profiles. Two new Low
findings (F5 stale GIF, F6 r3 matrix missing from phase-3.md) were both
resolved by the primary before this verdict was written. All requirements and
acceptance criteria are covered; the configured gate is green at final code.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| Exact phase command (6 files incl. module-size) | pass — 72/0, 9,127 expect() | `verification/phase-R1.md` |
| `bun run verify && bun run build` (fresh, final code) | pass — 4,630 pass / 1 skip / 0 fail, 685,273 expect(), 4,631 tests / 446 files; Biome clean on 1,063 files; voxel determinism byte-identical | `verification/phase-R1.md`, `verification/integrated.md` |
| `bun test --check --parallel=4` module-size | pass — framing.ts 11,691 B ≤ 12,288 B cap | `verification/phase-R1.md` |
| Exhaustive whole-body containment probe | pass — 252,000 projections, 0 failures | `.conductor/evidence/arena-framing-exhaustive-result.json` |
| Fresh r3 browser matrix + consoles | pass — 12 action stills + establishing at 3 viewports; 2 messages, 0 errors/warnings per session; `errors:[]` every run | `verification/phase-3.md` (r3 section), `verification/phase-R1.md` |
| Fresh PR GIF (final code) | pass — 960 px, 8 fps, 48 frames, ~2.9 MB, mid-frame spot-checked | `.conductor/media/20261127-arena-readability-pass/arena-readability.gif` (gitignored) |
| `git diff --check` | pass | primary |
| Scope audit (`git diff base..HEAD --stat`) | pass — code delta confined to `rig.ts`, `framing.ts`, `framing.test.ts`; no sim/audio/voxel/save/dependency/lockfile/generated changes; `arena.ts` + `battle-hud.css` untouched in delta; `d79dbbcd` is an out-of-track chore commit (reviewer model pin), excluded | reviewer |

## Requirements

| ID | Status | Evidence / note |
| --- | --- | --- |
| FR-1 | covered | Containment-only 0.2 envelope + padded aim; rest floor on measured rest height; r3 ray worst case 0.0999 / 85.1 px portrait. |
| FR-2 | covered | Hard-cut lifecycle, 750 ms establishing beat, reduced-motion tracked action; R1/R2 every-frame tests. |
| FR-3 | covered | Arena-only dressing/lighting/fog (unchanged in delta). |
| FR-4 | covered | 0.38 target + explicit 0.1 fallback; measured ray/golem/draconic portrait fixtures both mirrors. |
| FR-5 | covered | Full names, no ellipsis/overflow (unchanged in delta; r3 widths re-measured). |
| FR-6 | covered | Lifecycle, moving-pair, dense, safe-area, resize tests green. |
| FR-7 | covered | Fresh r3 matrix (spar history + cup cinematic ×3 viewports + establishing ×3 + after-cut); final-code GIF transcoded. |
| NFR-1 | covered | No sim diff; determinism byte-identical. |
| NFR-2 | covered | No audio diff. |
| NFR-3 | covered | Determinism gate green; no voxel/generated diff. |
| NFR-4 | covered | No ranch/shared-lighting diff. |
| NFR-5 | covered | Module caps green; Biome clean; no dependency/lockfile/harness diff. |
| AC-1 | covered | Rest floor holds at every captured beat incl. reduced motion. |
| AC-2 | covered | Every-frame containment incl. first frame and focus jumps; establishing corners in-frame everywhere. |
| AC-3 | covered | Broadcast/cinematic/reduced-motion verified; 12/12 r3 vision verdicts clean. |
| AC-4 | covered | Arena contrast improved; frozen surfaces unchanged. |
| AC-5 | covered | Full names visible; 39/37 metric is line-box overhang, not visible clipping. |
| AC-6 | covered | Dense/safe-area/finite checks pass; clean consoles. |
| AC-7 | covered | Gate + build green; browser matrix complete; GIF ready for PR attach. Terminal PR/completion steps are primary-owned and follow this review. |

## Findings

### Round 1 findings — all closed

#### F1 (was High) — Establishing-to-action handoff crop: FIXED

`apps/client/src/camera/rig.ts:215-250` hard-cuts pose + FOV together on every
arena action frame; beat, style-switch, resize, and focus-jump paths all cut.
R1 lifecycle tests check the first and every subsequent update from
`setMode("arena")`; R2 asserts the exact safe pose on every frame of a moving
pair. No action needed.

**Requirement:** FR-1, FR-2, FR-6, AC-2, AC-3, AC-6.

#### F2 (was High) — Reduced-motion wide shot: FIXED

Reduced motion tracks readable broadcast action (`rig.ts:221-227`), skips the
beat, resets shake, ignores director choreography. Old wide-FOV assertion
replaced with exact-pose, floor, containment, no-shake, FOV≠wide assertions at
all three viewports. No action needed.

**Requirement:** FR-1, FR-2, FR-4, AC-1, AC-3, AC-6.

#### F3 (was High) — Missing cup cinematic / clean establishing evidence: FIXED

Fresh final-code r3 matrix on disk: cup cinematic `action-a..d` at 1440×900,
393×852, 852×393; live-app establishing at all three viewports; after-cut
stills; consoles 2/0/0; `errors:[]` every run. 12/12 action vision verdicts:
zero viewport-edge clip. Disclosed residuals: 852×393 establishing has partial
HUD-panel overlap + fade transition (overlay class, not crop). No action
needed.

**Requirement:** FR-7, AC-7.

#### F4 (was Medium) — Separation threshold unenforced: FIXED

`framing.ts:105-109`: `TARGET_CENTER_SEPARATION = 0.38` documented as target
with explicit `MIN_DISTINCT_SEPARATION = 0.1` fallback that never yields
containment/floor. Measured ray (0.073514/0.136), draconic (0.364/0.208),
golem (0.450545/0.236) fixtures at portrait both mirrors assert containment +
floor + fallback. Strict-policy Medium closed. No action needed.

**Requirement:** FR-4, AC-3.

### Round 2 findings — both Low, both resolved

#### F5 (Low) — Stale PR GIF: RESOLVED

The media directory held only a pre-corrective GIF. Primary transcoded 48
final-code frames (`r3-gif-frame-00..47` via `r3-capture-gif.js`) to a fresh
`arena-readability.gif` (960 px, 8 fps, ~2.9 MB) and spot-checked a
mid-sequence frame. Attach the fresh file to the PR, not the old one.

**Requirement:** FR-7, AC-7.

#### F6 (Low) — r3 matrix missing from phase-3.md: RESOLVED

Primary appended the final-code r3 section (matrix table, establishing
residuals, GIF command) to `verification/phase-3.md`. Committed with this
review.

**Requirement:** none (documentation completeness).

## Overrides

None. No requirement was waived; all AC are covered by code, tests, or fresh
browser evidence.

## Plan compliance

Phase R1 T1–T3 verified (72/0/9127, Biome clean, module cap green, full gate
4630/1/0 + build exit 0). Scope is clean: only `rig.ts`, `framing.ts`,
`framing.test.ts` plus verification docs; freeze lines hold. The abandoned 0.35
pad and the exhausted rework-1/2 history are recorded in `phase-R1.md` and do
not leak into the plan state.

## Out of scope

No simulation, legal-bound, save/state, balance, audio, voxel, fighter-scale,
ranch/shared-lighting, dependency, generated-file, or committed browser-harness
change is proposed.

## Debt

None accepted. The 852×393 establishing HUD-panel overlap + fade timing and
the landscape HUD 39/37 line-box metric are explicitly assessed as non-defects
(overlay class / line-box overhang, both disclosed in `phase-3.md`).

## Doc sync

Pre-review tech-stack note committed (`7b3085f4`); post-review sync: no
product-guideline, roadmap, or tech-stack change is required by this review —
F5/F6 were evidence-assembly items, not design changes. `doc_sync` may be
marked `complete` once this review and the phase-3.md r3 section are
committed.

## History

| Round | Verdict | Fixed | Accepted | Open | Deferred |
| --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 0 | 4 | 0 |
| 2 | PASS | 4 | 0 | 0 | 0 |
