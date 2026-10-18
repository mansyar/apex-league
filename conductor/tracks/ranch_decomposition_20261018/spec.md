# Specification: Ranch Decomposition

## Overview

`apps/client/src/scene-logic.ts` (43.1 KB) and `apps/client/src/ranch-motion.ts`
(39.8 KB) each gained one machine per track and now sit 4-5x over the 8-12 KB
file caps the Cup Module Refactor established. `scene-logic.ts` holds eleven
machines and helper groups (feed walk, evolution, rest, treat, play, pet, gait,
wander, wind, stage scales, arena framing); `ranch-motion.ts` is a render
adapter that also owns pure math (`smoothstep`, `gaitIntensity`,
`standPointOnLineTo`), and one easing function is implemented twice.

This track splits both files into single-purpose modules under the cap. It is a
pure relocation: no behavior change, no public API change, no schema change. The
goal is that the next ranch feature reads, reviews, and bisects one machine at a
time instead of one 43 KB file.

**Track type:** Refactor.

## Measured baseline

- `scene-logic.ts` 43.1 KB, `ranch-motion.ts` 39.8 KB.
- Caps set by the Cup Module Refactor: 8.4 / 6.5 / 12.0 KB for the split files.
- 14 files import from `./scene-logic`; only 2 import from `./ranch-motion`
  (`scene.ts`, `ranch-motion.test.ts`).
- 12 co-located test files cover the logic module.
- Duplicate easing: `ranch-motion.ts:75` and `scene-logic.ts:479` (identical
  formula).
- No file is module-level stateful; every machine is a factory, so relocation
  cannot change runtime identity.

## Functional Requirements

- **FR1 - Split `scene-logic.ts`** into
  `scene-logic/{math,wind,stage,feed,evolution,rest,treat,play,pet,gait,wander,framing}.ts`,
  one banner section per file, each carrying its existing explanatory comment.
- **FR2 - Preserve the public surface.** `scene-logic.ts` remains as a barrel
  re-exporting exactly today's symbols; all 14 importers stay byte-identical.
- **FR3 - Replace `ranch-motion.ts`** with `ranch/{motion,poses,sparkle,ball}.ts`.
  `motion.ts` keeps the `RanchMotion` interface, the dependency wiring, and the
  frame loop; no compatibility barrel is created for a two-consumer module.
- **FR4 - Move pure math out of the adapter.** `smoothstep`, `gaitIntensity`,
  and `standPointOnLineTo` live in `scene-logic/` (math/gait/feed); `ranch/`
  performs three.js writes only.
- **FR5 - Collapse the duplicate easing** to a single `smoothstep` export;
  delete `smoothstepLocal`.
- **FR6 - Relocate `arenaFramingAdjust`** to `scene-logic/framing.ts` with no
  consumer changes.
- **FR7 - Co-locate the 12 command tests** (`scene-logic/play.test.ts`, ...);
  test names, cases, and assertions are unchanged, only imports move.
- **FR8 - Guard the result**: a test fails if any file under `scene-logic/` or
  `ranch/` exceeds 12 KB, and a second test pins the barrel's exported symbol
  set so a silent re-export drop cannot ship.

## Non-Functional Requirements

- No save-schema change; `packages/sim` is not edited by this track.
- No new dependency.
- The barrel export surface is identical (proved by typecheck plus the
  no-importer-churn check).
- Voxel determinism output stays byte-identical.
- No change to per-frame allocation behavior: poses still write in place, and
  no closures or objects are introduced into the update path.

## Acceptance Criteria

- `bun run verify` is green: typecheck clean, the existing 1457 tests still
  pass, plus the two new guard tests.
- The diff touches only the two source areas, their tests, and
  `conductor/tech-stack.md`.
- `git diff --stat` shows no changes under `apps/client/src` other than
  `scene-logic.ts`, `ranch-motion.ts` (deleted), `ranch/`, `scene-logic/`,
  `scene.ts` (import lines only), and the relocated tests.
- Browser pass confirms: breathing idle, feed walk-out/nibble/walk-home,
  wandering, rest, treat, play, pet reaction with chirp, and orbit drag.
- The size guard fails when pointed at a deliberately over-cap file, then is
  reverted.

## Out of Scope

- `main.ts`, `hud.ts`, `handbook.ts`, CSS.
- Any new behavior, tuning, or content.
- Renaming or reshaping public symbols; changing test cases.
- Camera, sim, or voxel packages beyond imports.

## Risks

- A missed re-export breaks an importer silently at runtime. Mitigation: the
  barrel-surface test (FR8) plus a clean typecheck, which fails on a dropped
  named export.
- Test co-location changes import specifiers in 12 files; mitigated by moving
  them with plain relative paths and running the suite per phase.
- Moving code wholesale can drag in circular imports (e.g. `gait` imported by
  `feed`). Mitigation: pure leaf modules (`math`, `wind`, `stage`) import
  nothing from siblings; machines import only from leaves.
