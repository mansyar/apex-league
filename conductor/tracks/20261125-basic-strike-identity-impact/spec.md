# Author Basic Strike identity and KO/down impact weighting — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track gives the innate `basic` move ("Strike") an authored client-side
presentation identity and makes the terminal knockout blow read heavier than an
ordinary knockdown. Both changes stay in the client presentation layer: the sim
contract, save shape, and generated artifacts are untouched.

## Problem / Motivation

`fxFor("basic", undefined)` misses `MOVE_FX` (which holds 48 bespoke specials)
and the element fallback, so Strike — the most frequent action in a fight —
renders through `DEFAULT_FX`, the same body an unknown move uses. Meanwhile the
KO beat already has 2.5× dilation, a stamp hold, and a dust ring, but
`REACTION_BASES.down` is shared by every knockdown, so the killing blow carries
no authored extra weight. Players therefore read the common action as generic
and the climax as an ordinary down. Left unaddressed, the game's most-repeated
moment and its emotional peak both look accidental.

## Goals & Success Metrics

- **Goal:** Strike reads as a deliberate melee jab; a terminal KO lands with
  visibly more weight than a non-terminal down.
- **Metric:** a visual capture shows both beats distinct from the generic
  fallback and the ordinary down, table unit tests lock the authored rows, and
  every configured verification layer passes.

## Scope

### In Scope

- Author an `MOVE_FX["basic"]` melee-jab row (windup, recoil, contact, arrival)
  in the existing declarative move-FX grammar.
- Author terminal-KO impact weighting driven by the existing step `ko` flag and
  archetype `hurtMult`, leaving the non-terminal `down` reaction unchanged.
- Add unit tests pinning the authored tables and the KO-vs-down distinction,
  including the strict no-regression boundary for other moves.
- Capture desktop and phone visual evidence for Strike and the terminal KO.
- Fold the one-line `conductor/workflow.md` §Release deploy correction into the
  track's doc-sync (the workflow claims `deploy.yml` has never been on `main`
  and that the Pages URL does not resolve; both are now false).

### Out of Scope

- Changing sim `BASIC_MOVE` power, accuracy, cooldown, or melee semantics, and
  any consequent re-balancing.
- Save schema, version bumps, migrations, or `docs/save-schema.md` changes.
- New dependencies or stack decisions.
- Changes to any of the 48 bespoke special FX rows or the unknown-id fallback.
- New audio assets or changes to the shared cue library.
- Changes to determinism-hash inputs (creature GLBs and prop digests).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The innate `basic` move resolves to an authored `MoveFx` row with a melee-jab windup/recoil/arrival grammar, not `DEFAULT_FX`. | must |
| FR-2 | Resolution for every other move id and for known/unknown-element fallbacks is unchanged. | must |
| FR-3 | A `down` step with `ko === true` resolves a heavier authored reaction than a non-terminal `down`; the non-terminal row is unchanged. | must |
| FR-4 | The new Strike and weighted-KO treatment respects calm/reduced-motion mode. | must |
| FR-5 | Visual evidence captures the Strike jab and the terminal KO landing for review. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | All 48 bespoke specials and the unknown-id fallback stay pixel-identical, proven by the existing move-FX tests and the determinism gate. |
| NFR-2 | Every touched client module stays at or under the 12 KB cap enforced by `module-size.test.ts`. |
| NFR-3 | No new dependency is introduced. |
| NFR-4 | Full configured stack is green: `biome check`, `bun test --timeout 120000`, `bun run check`, `bun run verify`, `bun run build`, plus a visual capture. |
| NFR-5 | Double KO, the dense playback stream, and pause/seek mid-beat leak neither the heavier reaction nor dilation state into subsequent beats. |
| NFR-6 | No persisted shape changes, so no save version bump or migration is needed. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `fxFor("basic", undefined)` returns an authored row distinct from `DEFAULT_FX` with an authored melee posture. | FR-1 |
| AC-2 | All 48 special ids, plus unknown ids with known and unknown elements, resolve identically to the baseline. | FR-2 |
| AC-3 | A terminal `down` reaction differs from the ordinary `down` in impulse/reel/landing, while the ordinary row keeps its current values. | FR-3 |
| AC-4 | In calm/reduced-motion mode both new beats resolve the dampened response and no new cue is introduced. | FR-4 |
| AC-5 | A visual capture shows Strike distinct from the generic fallback and the terminal KO distinct from an ordinary down. | FR-5 |
| AC-6 | Double KO weights both downed bodies; dense stream and mid-beat pause/seek show no leaked reaction or dilation state. | FR-3, NFR-5 |
| AC-7 | `biome check`, `bun test --timeout 120000`, `bun run check`, `bun run verify`, `bun run build`, and the module-size test all pass. | NFR-1, NFR-2, NFR-4, NFR-6 |

## Edge Cases

- Calm/reduced-motion mode: authored beats keep the existing dampened behavior.
- Double KO / simultaneous down: both bodies receive the weighted reaction.
- Fast dense playback stream: the weighted beat does not disturb stream-owned bodies.
- Pause/seek mid-beat: no reaction latch or slow-motion state leaks into the next beat.
- Unknown element fallback: unchanged resolution for ids absent from `MOVE_FX`.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** the existing `ko` flag on playback steps is sufficient to
  distinguish a terminal KO from an ordinary down; no new sim payload is
  needed.
- **Assumption:** "impact weighting" means presentation weight only — sim
  damage and outcome stay untouched.
- **Assumption:** doc-sync includes the one-line `conductor/workflow.md`
  §Release correction described in Scope.
- **Question:** none.

## References

- `conductor/roadmap.md` — RM-12 (origin: user)
- `packages/sim/src/battle/moves.ts` — `BASIC_MOVE` / `getMove("basic")`
- `apps/client/src/move-fx.ts`, `apps/client/src/move-fx/moves.ts` — `fxFor`, `MOVE_FX`, `DEFAULT_FX`
- `apps/client/src/choreo.ts` — `REACTION_BASES`, `reactionFor`
- `apps/client/src/steps/down.ts` — the terminal-KO branch and `DUST_RING`
- `apps/client/src/pacing.ts`, `apps/client/src/playbackDriver.ts` — KO dilation and terminal beat
- `conductor/workflow.md` — verification layers and commands
