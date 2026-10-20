# Evolution Threshold Discovery UI — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add a **Growth** section to the active creature's detail modal that explains the
evolution gate the creature is currently facing. It starts qualitative — naming
what is blocking without revealing numbers — and permanently unlocks exact
thresholds for a gate once the player has evolved a creature through it.
Discovery is per gate and persists save-wide.

## Problem / Motivation

`evaluateEvolution` already knows precisely why a creature did not evolve
(`too_young`, `recently_sick`, `low_mood`, `low_bond`, `no_cup_win`), but
nothing surfaces it. The only feedback is a directional coach tease in
`apps/client/src/hud/copy.ts` that deliberately withholds thresholds. On a first
raise that is good design; on a replay it is guesswork. The player cannot
answer "what is actually stopping this evolution?" from inside the game.

## Goals & Success Metrics

- **Goal:** A returning player can identify the exact next blocker from the
  creature panel, without external documentation or trial and error.
- **Metric:** Behavioral — tests assert the correct condition set and labeling
  for every `EvolutionReason` in both discovery states, plus the v17 migration
  matrix. Visual review confirms the first raise still withholds numbers and a
  second raise reveals them.

## Scope

### In Scope

- A Growth section in the active creature's detail modal.
- Qualitative condition rows before discovery; target + current values after.
- Two independent discovery flags (juvenile gate, champion gate), unlocked on
  successful evolution.
- Save v17: persisted knowledge on `GameState`, with migration and inference for
  existing evolved creatures.
- In-place refresh if the panel is open when a settlement resolves.
- Module-size-compliant placement of the new view-model.

### Out of Scope

- Changes to coach growth hints, handbook copy, or any other surface.
- Retuning any threshold, gate rule, or stat boost.
- Hall of Fame records.
- Telemetry or analytics.
- Per-condition or partial discovery.
- Revealing the champion gate's existence before the juvenile gate is cleared.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The active creature's detail modal shows a Growth section for its current stage gate. | must |
| FR-2 | Before a gate is discovered, every condition row states a qualitative status with no numeric threshold or target. | must |
| FR-3 | After a gate is discovered, every condition row shows its target and the creature's current value. | must |
| FR-4 | Discovery is per gate and save-wide; the juvenile gate unlocks on baby→juvenile, the champion gate on juvenile→champion. | must |
| FR-5 | Save v17 persists the flags and migrates older saves; a juvenile marks the juvenile gate known, a champion marks both. | must |
| FR-6 | A champion sees a final-stage note instead of conditions. | must |
| FR-7 | The section refreshes in place if a settlement resolves while the panel is open. | should |
| FR-8 | Hall of Fame records are unchanged. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Met/unmet is conveyed by text plus a distinct glyph; colour is reinforcement only. The section exposes an accessible name. |
| NFR-2 | Every new or touched client module stays at or under 12 KB; `apps/client/src/module-size.test.ts` stays green. |
| NFR-3 | No change to voxel generators, artifacts, or the determinism gate. |
| NFR-4 | Migration is total and idempotent; importing any v1–v16 save or a round-tripped export never throws and never loses knowledge. |
| NFR-5 | Copy follows `product-guidelines.md`: announcer/coach voice, at most two sentences per row, no legalese, numbers over jargon once revealed. |
| NFR-6 | No new runtime dependency. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Opening the panel for a baby shows a Growth section covering age, sickness recovery, and mood. | FR-1 |
| AC-2 | Undiscovered rows contain no digits and no threshold words such as "day 10", "40", "60". | FR-2 |
| AC-3 | A discovered gate renders the target/current pair for each condition, e.g. `Mood 35 / 40`, `Day 6 / 10`, `Bond 52 / 60`, `Cup wins 0 / 1`. | FR-3 |
| AC-4 | Evolving a baby sets only the juvenile flag; evolving to champion sets both. | FR-4 |
| AC-5 | A v16 save with a juvenile loads with the juvenile gate discovered; one with a champion loads with both; a fresh save with none. | FR-5 |
| AC-6 | A champion's Growth section reads as final stage and lists no conditions. | FR-6 |
| AC-7 | With the panel open, a settlement that evolves the creature updates the section without reopening. | FR-7 |
| AC-8 | Hall of Fame record rendering is byte-identical to today. | FR-8 |
| AC-9 | Each row's met/unmet status is readable without colour, and the section has an accessible name. | NFR-1 |
| AC-10 | `bun test` stays green including the 12 KB module-size guard. | NFR-2 |

## Edge Cases

- No creature yet (starter pending): the modal is not reachable; the view-model
  must not throw if called.
- Juvenile past day 25 blocked by mood or bond: the age row reads met while
  others do not.
- `sickCooldown > 0` with every other juvenile condition met: recovery is the
  only blocker.
- Champion with cups and bond above every threshold: final-stage note only.
- v1–v16 saves, including the archived broken-save fixture, must not throw.
- Export → import round-trip preserves both flags.
- Reduced motion: the section is static; any reveal animation is omitted or
  suppressed.
- A gate discovered mid-session repaints correctly without a reload.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** Discovery is one boolean per gate, not per condition; the whole
  gate reveals at once.
- **Assumption:** "Clean nights" after discovery shows the remaining count
  (`2 clean nights to go`), since `sickCooldown` already counts nights.
- **Assumption:** The detail modal is only reachable from the ranch HUD, so the
  Growth section never renders during a battle.
- **Assumption:** Save-wide means the current save file; wiping the save resets
  discovery.
- **Question:** Whether a future "reset knowledge" affordance is wanted —
  deferred, not part of this track.

## References

- `packages/sim/src/evolution.ts`, `packages/sim/src/state.ts`,
  `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrate.ts`
- `apps/client/src/creature-detail.ts`, `apps/client/src/hud/copy.ts`
- `docs/save-schema.md`, `conductor/product-guidelines.md`
