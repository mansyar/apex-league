# Adopt stage-scaled animation and ranch body profiles — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Client-only presentation track that makes an archetype's authored motion
identity and its life stage visible in both the arena and the ranch. The arena
keeps its existing per-archetype physical footprint; the ranch keeps its
existing physical stage ladder and authored set pieces. Both compose the shared
`choreo.ts` profile table with a stage factor on top.

## Problem / Motivation

`choreo.ts` already defines per-archetype gait, sway, breath, flinch and commit
identities, but the ranch's mood idles and ceremonies never read them; its
`stageScale` ladder only changes holder size. In the arena, `roster.ts`
normalizes size by archetype but ignores `CastInfo.stage`, so a champion fights
with baby-like motion. Players therefore see species and stages that look right
in silhouette but move alike. Without this, the roster's authored identity data
stays half-used and the vertical slice feels flatter than intended.

## Goals & Success Metrics

- **Goal:** Every species reads distinctly in motion in both scenes, and
  Baby/Juvenile/Champion read distinctly in the arena and ranch, without
  changing gameplay or authored set-piece outcomes.
- **Metric:** Table coverage for every archetype × three stages plus all five
  edge cases; all seven ranch ceremonies covered; determinism hashes
  byte-identical; full `bun run verify && bun run build` green; desktop and
  phone visual captures with clean console.

## Scope

### In Scope

- Arena: derive a motion multiplier from `CastInfo.stage` using the existing
  `stageScale` ladder (missing stage → `1`), applied to gait/lean/hurt/recoil/
  strike amplitudes only; `bodyScaleFor` and sim footprint untouched.
- Ranch: read the same `BodyProfile` table (no duplicate), compose archetype
  profile with the stage factor, and apply amplitude **and tempo** to feed,
  rest, treat, play, pet, evolution and morning-after.
- Compose on top of authored evolution scale journey and morning-after pose
  law; multiply, never replace curves, triggers or callbacks.
- Calm/reduced-motion damps the new multipliers toward neutral with no new cue
  or state.
- Table tests, full configured stack, and desktop/iPhone visual evidence.

### Out of Scope

- Sim constants/state/creature data, save schema/version/migration, voxel
  templates/GLB/manifests/determinism hashes, ceremony triggers/order/
  completion outcomes, audio cue ids, new dependencies, new size ladders.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Arena resolves a per-cast motion profile from `profileFor(archetype)` × stage factor (`stageScale(stage)` when present, else `1`) and applies it to presentation amplitudes only; physical scale and sim coordinates unchanged. | must |
| FR-2 | Ranch consumes the single `choreo.ts` `BodyProfile` table and the existing `stageScale` ladder; unknown archetypes use `DEFAULT_PROFILE`; no duplicated profile table is introduced. | must |
| FR-3 | All seven ranch ceremonies (feed, rest, treat, play, pet, evolution, morning-after) apply profile amplitude and tempo multipliers; authored curves, scale journeys, pose laws, triggers, order and callbacks remain intact. | must |
| FR-4 | Reduced motion damps profile/stage multipliers toward neutral; no new cue id or persistent state; existing calm behavior unchanged. | must |
| FR-5 | Unknown archetype, missing stage, mid-ceremony evolution/swap, pause/hidden tab and dense battlefield are handled without leaks, NaN, overshoot or state drift. | must |
| FR-6 | Desktop 1440×900 and iPhone 15 captures show a ranch baby-vs-champion contrast and an arena stage contrast with a clean console. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No change to sim/state/save, voxel files/determinism hashes, ceremony outcomes or audio cue ids. |
| NFR-2 | Client module caps (12 KB) stay green. |
| NFR-3 | No new dependency or generated file. |
| NFR-4 | Full configured stack green, including `module-size.test.ts`. |
| NFR-5 | No sim payload, damage, timing, cooldown or outcome change; presentation only. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Table test covers every archetype × baby/juvenile/champion: arena factor equals `profile × stageScale`; missing stage yields `1`; `bodyScaleFor` values unchanged. | FR-1 |
| AC-2 | Ranch reads the shared table; unknown archetype falls back to `DEFAULT_PROFILE`; no duplicate table in `ranch/`. | FR-2 |
| AC-3 | Tests cover all seven ceremonies; triggers, order, callbacks and authored evolution/morning-after curves remain unchanged while amplitudes/tempo scale. | FR-3 |
| AC-4 | Reduced-motion test shows damping toward neutral and no new cue/state; full-motion baseline preserved. | FR-4 |
| AC-5 | All five edge cases pass with no NaN, leak, overshoot or cross-creature state. | FR-5 |
| AC-6 | Four screenshots (ranch + arena × desktop + phone) with clean console; stage and archetype differences visible. | FR-6 |
| AC-7 | Full gate, module caps, no dependency/save/voxel/audio diff. | NFR-1–NFR-5 |

## Edge Cases

- Unknown archetype: `profileFor` falls back to `DEFAULT_PROFILE` and the stage
  factor stays independent.
- Missing arena stage: rivals and vault entries resolve to neutral factor `1`
  while their voxel build still defaults to baby, as today.
- Evolution or rig swap mid-ceremony: no stale profile, yaw, pose or callback
  latch survives the rebuild.
- Pause/resume or hidden tab: tempo multipliers do not accumulate phase error
  or overshoot; no NaN enters a pose.
- Dense battlefield: multiple staged fighters keep independent profile state;
  one combatant's stage factor never leaks into another.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** `CastInfo.stage` is optional; an absent stage resolves to
  neutral factor `1`, and the voxel build default remains baby as today.
- **Assumption:** `choreo.ts` remains the single source of truth for body
  profiles; the ranch imports the composer rather than duplicating values.
- **Assumption:** "Multiply, don't replace" keeps authored curves, the
  evolution holder-scale journey, morning-after pose law, triggers and
  callbacks unchanged; only amplitudes and tempo are scaled.
- **Assumption:** The seven named ceremonies (feed, rest, treat, play, pet,
  evolution, morning-after) are the complete ranch set.
- **Assumption:** Real ranch and spar UI suffice for captures; no debug view
  is needed.
- **Open questions:** none.

## References

- `conductor/roadmap.md` — RM-8.
- `conductor/archive/20261024-battle-choreography-all-creatures/spec.md`,
  `pr.md`, `verification/phase-4.md` — authored profiles and the two deferred
  follow-ups this track closes.
- `conductor/learnings.md` — rig-unit and anchoring rules that must not be
  violated by any new pose math.
- `apps/client/src/choreo.ts`, `apps/client/src/roster.ts`,
  `apps/client/src/spar/casting.ts`, `apps/client/src/scene-logic/stage.ts`,
  `apps/client/src/ranch/`.
